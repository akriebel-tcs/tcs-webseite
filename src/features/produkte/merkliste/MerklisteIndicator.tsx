import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMerkliste } from "./useMerkliste";

/**
 * Kleiner Zugang zur Merkliste im Produktkatalog-Kontext.
 * Bewusst lokal – nicht in der globalen Website-Navigation.
 */
export default function MerklisteIndicator({ className }: { className?: string }) {
  const { count } = useMerkliste();
  const { t } = useTranslation("service");
  const label = t("katalog.target.merkliste.label", { count });
  return (
    <Link
      to="/produkte/merkliste"
      className={
        "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent/10 transition-colors " +
        (className ?? "")
      }
      aria-label={label}
    >
      <Bookmark className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
