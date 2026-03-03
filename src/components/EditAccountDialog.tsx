import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    nome_empresa: string;
    plano: string;
    ativo: boolean;
  } | null;
  onSave: (data: { id: string; nome_empresa: string; plano: string; ativo: boolean }) => void;
}

const EditAccountDialog = ({ open, onOpenChange, account, onSave }: EditAccountDialogProps) => {
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [plano, setPlano] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (account) {
      setNomeEmpresa(account.nome_empresa);
      setPlano(account.plano);
      setAtivo(account.ativo);
    }
  }, [account]);

  const handleSave = () => {
    if (!account) return;
    onSave({
      id: account.id,
      nome_empresa: nomeEmpresa,
      plano,
      ativo,
    });
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nome_empresa">Nome da Empresa</Label>
            <Input
              id="nome_empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="plano">Plano</Label>
            <Select value={plano} onValueChange={setPlano}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ativo">Status</Label>
            <Select value={ativo ? "true" : "false"} onValueChange={(v) => setAtivo(v === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ativo</SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountDialog;
