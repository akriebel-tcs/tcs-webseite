import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  EXPECTED_SUPABASE_PROJECT_ID,
  type CatalogDiagnostics,
  type CheckResult,
} from "../api/diagnostics";

interface CatalogStatusProps {
  loading: boolean;
  error: string | null;
  count: number;
  diagnostics: CatalogDiagnostics | null;
  showDiagnosticsTable?: boolean;
  showCount?: boolean;
}

type DominantState =
  | "loading"
  | "notConfigured"
  | "wrongProject"
  | "rpcUnavailable"
  | "viewUnreachable"
  | "emptyOrBlocked"
  | "ok"
  | "error";

function deriveDominantState(
  loading: boolean,
  error: string | null,
  d: CatalogDiagnostics | null,
): DominantState {
  if (loading) return "loading";
  if (error) return "error";
  if (!d) return "loading";
  if (!d.supabaseConfigured) return "notConfigured";
  if (d.urlMatchesExpectedProject === false) return "wrongProject";
  if (d.catalogContextRpc.status === "fail") return "rpcUnavailable";
  if (
    d.productsCatalogView.status === "fail" ||
    d.productFilterOptionsView.status === "fail"
  ) {
    return "viewUnreachable";
  }
  if (d.productsCatalogViewHasRows === false) return "emptyOrBlocked";
  return "ok";
}

function StatusIcon({ status }: { status: DominantState }) {
  if (status === "loading") {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }
  if (status === "ok") {
    return <CheckCircle2 className="w-4 h-4 text-accent" />;
  }
  if (status === "emptyOrBlocked") {
    return (
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    );
  }
  return <XCircle className="w-4 h-4 text-destructive" />;
}

function CheckRow({
  label,
  result,
  yes,
  no,
  skipped,
}: {
  label: string;
  result: CheckResult;
  yes: string;
  no: string;
  skipped: string;
}) {
  const value =
    result.status === "ok" ? yes : result.status === "fail" ? no : skipped;
  const tone =
    result.status === "ok"
      ? "text-accent"
      : result.status === "fail"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/40 last:border-b-0">
      <span className="text-foreground">{label}</span>
      <span className={`text-right ${tone}`}>{value}</span>
    </div>
  );
}

function BoolRow({
  label,
  value,
  yes,
  no,
  unknown,
}: {
  label: string;
  value: boolean | null;
  yes: string;
  no: string;
  unknown: string;
}) {
  const text = value === true ? yes : value === false ? no : unknown;
  const tone =
    value === true
      ? "text-accent"
      : value === false
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/40 last:border-b-0">
      <span className="text-foreground">{label}</span>
      <span className={`text-right ${tone}`}>{text}</span>
    </div>
  );
}

const CatalogStatus = ({
  loading,
  error,
  count,
  diagnostics,
  showDiagnosticsTable = true,
  showCount = true,
}: CatalogStatusProps) => {
  const { t } = useTranslation("service");

  const dominant = deriveDominantState(loading, error, diagnostics);

  const headline =
    dominant === "loading"
      ? t("katalog.mvp.status.loading")
      : dominant === "error"
        ? t("katalog.mvp.status.error")
        : dominant === "notConfigured"
          ? t("katalog.diagnostics.states.notConfigured")
          : dominant === "wrongProject"
            ? t("katalog.diagnostics.states.wrongProject")
            : dominant === "rpcUnavailable"
              ? t("katalog.diagnostics.states.rpcUnavailable")
              : dominant === "viewUnreachable"
                ? t("katalog.diagnostics.states.viewUnreachable")
                : dominant === "emptyOrBlocked"
                  ? t("katalog.diagnostics.states.emptyOrBlocked")
                  : t("katalog.diagnostics.states.ok");

  const yes = t("katalog.diagnostics.values.yes");
  const no = t("katalog.diagnostics.values.no");
  const skipped = t("katalog.diagnostics.values.skipped");
  const unknown = t("katalog.diagnostics.values.unknown");

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-2 text-foreground">
          <StatusIcon status={dominant} />
          {headline}
        </span>

        {!loading && !error && showCount ? (
          <span className="text-xs">
            {t("katalog.mvp.status.count", { count })}
          </span>
        ) : null}
      </div>

      {diagnostics && showDiagnosticsTable ? (
        <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium mb-3">
            <Database className="w-3.5 h-3.5" />
            {t("katalog.diagnostics.headline")}
          </div>
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <BoolRow
                label={t("katalog.diagnostics.labels.supabaseConfigured")}
                value={diagnostics.supabaseConfigured}
                yes={yes}
                no={no}
                unknown={unknown}
              />
              <BoolRow
                label={t("katalog.diagnostics.labels.urlPresent")}
                value={diagnostics.supabaseUrlPresent}
                yes={yes}
                no={no}
                unknown={unknown}
              />
              <BoolRow
                label={t("katalog.diagnostics.labels.projectMatch", {
                  expected: EXPECTED_SUPABASE_PROJECT_ID,
                })}
                value={diagnostics.urlMatchesExpectedProject}
                yes={yes}
                no={no}
                unknown={unknown}
              />
            </div>
            <div>
              <CheckRow
                label={t("katalog.diagnostics.labels.rpc")}
                result={diagnostics.catalogContextRpc}
                yes={yes}
                no={no}
                skipped={skipped}
              />
              <CheckRow
                label={t("katalog.diagnostics.labels.productCatalogView")}
                result={diagnostics.productsCatalogView}
                yes={yes}
                no={no}
                skipped={skipped}
              />
              <BoolRow
                label={t("katalog.diagnostics.labels.productCatalogViewRows")}
                value={diagnostics.productsCatalogViewHasRows}
                yes={yes}
                no={no}
                unknown={unknown}
              />
              <CheckRow
                label={t(
                  "katalog.diagnostics.labels.productFilterOptionsView",
                )}
                result={diagnostics.productFilterOptionsView}
                yes={yes}
                no={no}
                skipped={skipped}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CatalogStatus;
