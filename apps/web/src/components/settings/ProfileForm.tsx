"use client";

import { useState } from "react";
import { User, Phone, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { getPublicApiUrl } from "@/lib/public-api";
import { useRouter } from "next/navigation";
import styles from "./SettingsForms.module.css";

interface ProfileFormProps {
  initialName: string;
  initialPhone?: string | null;
  token: string;
}

export function ProfileForm({ initialName, initialPhone, token }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${getPublicApiUrl()}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? data?.message ?? "Não foi possível atualizar o perfil.");
        return;
      }

      setSuccess("Perfil atualizado com sucesso!");
      router.refresh();
    } catch {
      setError("Erro na conexão com o servidor.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label htmlFor="name" className={styles.label}>
          <User size={16} />
          Nome Completo
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={styles.input}
          placeholder="Seu nome"
        />
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="phone" className={styles.label}>
          <Phone size={16} />
          Telefone / WhatsApp
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={styles.input}
          placeholder="(11) 99999-9999"
        />
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className={styles.successAlert}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <button type="submit" disabled={pending} className={styles.submitButton}>
        <Save size={16} />
        {pending ? "Salvando…" : "Salvar Alterações"}
      </button>
    </form>
  );
}
