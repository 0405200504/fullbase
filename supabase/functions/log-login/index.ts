import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogLoginRequest {
  userId: string;
  email: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

// Validate IPv4 address format
function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

// Validate IPv6 address format
function isValidIPv6(ip: string): boolean {
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::$/;
  return ipv6Regex.test(ip);
}

// Validate IP address format (supports both IPv4 and IPv6)
function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  // Handle comma-separated IPs from x-forwarded-for (take the first one)
  const firstIp = ip.split(',')[0].trim();
  return isValidIPv4(firstIp) || isValidIPv6(firstIp);
}

// Extract and sanitize IP address from request
function extractIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  // Prefer x-forwarded-for, then x-real-ip
  let candidateIp = forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || 'unknown';
  
  // Validate the IP format
  if (candidateIp !== 'unknown' && !isValidIP(candidateIp)) {
    console.warn(`Invalid IP address format detected: ${candidateIp.substring(0, 50)}`);
    return 'invalid';
  }
  
  return candidateIp;
}

// Sanitize and validate location response from external API
function sanitizeLocationResponse(data: any): Record<string, any> | null {
  if (!data || typeof data !== 'object') return null;
  
  // Only allow specific, safe fields
  const allowedFields = ['city', 'region', 'country', 'country_name', 'timezone', 'org'];
  const sanitized: Record<string, any> = {};
  
  for (const field of allowedFields) {
    if (data[field] && typeof data[field] === 'string') {
      // Truncate to prevent excessive data storage
      sanitized[field] = data[field].substring(0, 100);
    }
  }
  
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

// Check if IP is a private/local address
function isPrivateIP(ip: string): boolean {
  if (ip === 'unknown' || ip === 'invalid') return true;
  
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^0\./,
    /^169\.254\./,
    /^::1$/,      // IPv6 localhost
    /^fc00:/i,    // IPv6 private
    /^fd00:/i,    // IPv6 private
    /^fe80:/i,    // IPv6 link-local
  ];
  
  return privateRanges.some(range => range.test(ip));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, userAgent, success, failureReason }: LogLoginRequest = await req.json();
    
    // Validate required fields - email is always required, userId is optional (for failed logins)
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: email is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Validate UUID format for userId if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUserId = userId && uuidRegex.test(userId) ? userId : null;
    
    // Extract and validate IP address
    const ipAddress = extractIP(req);

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent || '');

    // Try to get location information for public IPs only
    let locationInfo = null;
    try {
      if (!isPrivateIP(ipAddress) && isValidIP(ipAddress)) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const locationResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Lovable-Login-Logger/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (locationResponse.ok) {
          const rawLocation = await locationResponse.json();
          locationInfo = sanitizeLocationResponse(rawLocation);
        }
      }
    } catch (error) {
      console.log('Could not get location info:', error instanceof Error ? error.message : 'Unknown error');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from('login_history')
      .insert({
        user_id: validUserId,
        email: email.substring(0, 255), // Truncate email
        ip_address: ipAddress.substring(0, 45), // Max length for IPv6
        user_agent: (userAgent || '').substring(0, 500), // Truncate user agent
        device_info: deviceInfo,
        location_info: locationInfo,
        success: Boolean(success),
        failure_reason: failureReason ? failureReason.substring(0, 255) : null,
      });

    if (insertError) {
      throw new Error(`Error recording login: ${insertError.message}`);
    }

    console.log(`Login recorded for ${validUserId || email} - Success: ${success}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error recording login:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), // Don't expose internal error details
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper function for basic user agent parsing
function parseUserAgent(ua: string): Record<string, string> {
  const deviceInfo: Record<string, string> = {
    browser: 'Unknown',
    os: 'Unknown',
    device_type: 'Unknown'
  };

  if (!ua || typeof ua !== 'string') return deviceInfo;
  
  // Truncate ua for safety
  const safeUa = ua.substring(0, 500);

  // Detect browser
  if (safeUa.includes('Chrome') && !safeUa.includes('Edg')) deviceInfo.browser = 'Chrome';
  else if (safeUa.includes('Firefox')) deviceInfo.browser = 'Firefox';
  else if (safeUa.includes('Safari') && !safeUa.includes('Chrome')) deviceInfo.browser = 'Safari';
  else if (safeUa.includes('Edg')) deviceInfo.browser = 'Edge';
  else if (safeUa.includes('Opera') || safeUa.includes('OPR')) deviceInfo.browser = 'Opera';

  // Detect OS
  if (safeUa.includes('Windows')) deviceInfo.os = 'Windows';
  else if (safeUa.includes('Mac OS X')) deviceInfo.os = 'macOS';
  else if (safeUa.includes('Linux') && !safeUa.includes('Android')) deviceInfo.os = 'Linux';
  else if (safeUa.includes('Android')) deviceInfo.os = 'Android';
  else if (safeUa.includes('iOS') || safeUa.includes('iPhone') || safeUa.includes('iPad')) deviceInfo.os = 'iOS';

  // Detect device type
  if (safeUa.includes('Mobile') || safeUa.includes('Android') || safeUa.includes('iPhone')) {
    deviceInfo.device_type = 'Mobile';
  } else if (safeUa.includes('Tablet') || safeUa.includes('iPad')) {
    deviceInfo.device_type = 'Tablet';
  } else {
    deviceInfo.device_type = 'Desktop';
  }

  return deviceInfo;
}

serve(handler);
