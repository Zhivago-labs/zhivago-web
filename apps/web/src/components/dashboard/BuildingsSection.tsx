import { Building2, MapPin, Home } from "lucide-react";
import { BuildingRoleSelect } from "./BuildingRoleSelect";
import { CreateBuildingForm } from "./CreateBuildingForm";
import type { OrganizationBuilding, OrganizationMember } from "@zhivago/shared";
import styles from "./TeamSection.module.css";

/**
 * Empreendimentos da organização (seção 8/9/17 da spec) — Lead Owner e backup editáveis aqui
 * (antes só existiam como campo do schema, sem nenhum jeito de atribuir exceto o checkbox
 * "Assumir todos os Leads deste empreendimento" no cadastro de imóvel, que se recusa a
 * sobrescrever quem já é o dono). Só quem pode gerenciar a equipe (OWNER/ADMIN) edita; os demais
 * só veem.
 */
export function BuildingsSection({
  buildings,
  eligibleMembers,
  canManage,
}: {
  buildings: OrganizationBuilding[];
  eligibleMembers: OrganizationMember[];
  canManage: boolean;
}) {
  if (buildings.length === 0 && !canManage) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon} data-tone="amber"><Building2 size={18} aria-hidden="true" /></span>
        <div className={styles.sectionText}>
          <h2 className={styles.sectionTitle}>Empreendimentos <span className={styles.count}>{buildings.length}</span></h2>
          <p className={styles.sectionSubtitle}>
            Cada empreendimento pode ter um responsável exclusivo pelos clientes (Lead Owner) e um substituto (backup).
          </p>
        </div>
      </div>

      {buildings.length === 0 ? (
        <div className={styles.emptyStateBox}>
          <Building2 size={22} aria-hidden="true" />
          <p className={styles.empty}>Nenhum empreendimento cadastrado ainda.</p>
        </div>
      ) : (
        <div className={styles.buildingGrid}>
          {buildings.map((building) => (
            <div key={building.id} className={styles.buildingCard}>
              <div className={styles.buildingHead}>
                <strong>{building.name}</strong>
                <span className={styles.buildingMeta}>
                  {building.address && <><MapPin size={13} aria-hidden="true" />{building.address} · </>}
                  <Home size={13} aria-hidden="true" />{building._count.listings} {building._count.listings === 1 ? "imóvel" : "imóveis"}
                </span>
              </div>
              {canManage ? (
                <div className={styles.buildingFields}>
                  <label className={styles.buildingField}>
                    <span>Lead Owner</span>
                    <BuildingRoleSelect buildingId={building.id} field="lead-owner" currentMemberId={building.leadOwnerMemberId} eligibleMembers={eligibleMembers} />
                  </label>
                  <label className={styles.buildingField}>
                    <span>Backup</span>
                    <BuildingRoleSelect buildingId={building.id} field="backup" currentMemberId={building.backupMemberId} eligibleMembers={eligibleMembers} />
                  </label>
                </div>
              ) : (
                <div className={styles.buildingFields}>
                  <p className={styles.buildingField}><span>Lead Owner</span>{building.leadOwner?.user?.name ?? "Ninguém"}</p>
                  <p className={styles.buildingField}><span>Backup</span>{building.backupMember?.user?.name ?? "Ninguém"}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className={styles.subForm}>
          <p className={styles.subFormTitle}>Novo empreendimento</p>
          <CreateBuildingForm />
        </div>
      )}
    </section>
  );
}
