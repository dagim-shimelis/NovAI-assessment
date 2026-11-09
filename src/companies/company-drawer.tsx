"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/auth/provider";
import { useLocalization } from "@/i18n/provider";
import { formatDate } from "@/i18n/locale";
import type { Company, CompanyStatus, CreateCompanyRequest, UpdateCompanyRequest } from "./contracts";
import { COMPANY_STATUSES } from "./contracts";
import { ApiHttpError } from "./client";
import { companyKeys, createCompanyQueries } from "./queries";
import { validateCreate } from "./validation";

type Draft = { name: string; domain: string; status: CompanyStatus };
type EditState = { base: Company; draft: Draft; phase: "editing" | "conflict" | "review" | "ready"; latest: Company | null };
const emptyDraft = (): Draft => ({ name: "", domain: "", status: "new" });
const fromCompany = (company: Company): Draft => ({ name: company.name, domain: company.domain ?? "", status: company.status });
const startEdit = (company: Company): EditState => ({ base: company, draft: fromCompany(company), phase: "editing", latest: null });

type DrawerProps = {
  drawer: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
  openerRef: RefObject<HTMLElement | null>;
  fallbackRef: RefObject<HTMLElement | null>;
};

export function CompanyDrawer({ drawer, onClose, onCreated, openerRef, fallbackRef }: DrawerProps) {
  const { dictionary: t } = useLocalization();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  return (
    <Sheet open={drawer !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {drawer && <SheetContent
        onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = openerRef.current?.isConnected ? openerRef.current : fallbackRef.current;
          target?.focus();
          openerRef.current = null;
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-6">
          <SheetHeader>
            <SheetTitle>{drawer === "new" ? t.drawerCreateTitle : t.title}</SheetTitle>
            <SheetDescription>{drawer === "new" ? t.drawerCreateDescription : t.drawerDetailDescription}</SheetDescription>
          </SheetHeader>
          <SheetClose ref={closeRef} type="button" className="shrink-0 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">{t.closeDrawer}</SheetClose>
        </div>
        {createdId === drawer && <p role="status" className="mx-6 mt-4 text-sm text-green-800">{t.createSuccess}</p>}
        {drawer === "new"
          ? <CreateContent key="new" onCreated={(id) => { setCreatedId(id); onCreated(id); }} />
          : <DetailContent key={drawer} id={drawer} />}
      </SheetContent>}
    </Sheet>
  );
}

type FieldErrorId = "nameRequired" | "invalidDomain" | "invalidStatus" | "validationError";

function fieldErrorId(value: string): FieldErrorId {
  if (value === "Name is required") return "nameRequired";
  if (value === "Must be a string or null") return "invalidDomain";
  if (value === "Invalid status") return "invalidStatus";
  return "validationError";
}

function useFormFields() {
  const [errors, setErrors] = useState<Record<string, FieldErrorId>>({});
  function clearError(field: string) {
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }
  function validate(draft: Draft): CreateCompanyRequest | null {
    const result = validateCreate(draft);
    if (result.ok) { setErrors({}); return result.value; }
    setErrors(Object.fromEntries(Object.entries(result.fields).map(([key, value]) => [key, fieldErrorId(value)])));
    if (result.fields.name) document.getElementById("drawer-name")?.focus();
    else if (result.fields.domain) document.getElementById("drawer-domain")?.focus();
    else if (result.fields.status) document.getElementById("drawer-status")?.focus();
    return null;
  }
  function handleApiError(error: unknown): "conflict" | "error" {
    if (error instanceof ApiHttpError) {
      if (error.status === 409) return "conflict";
      if (error.status === 422 && error.details?.fields) {
        setErrors(Object.fromEntries(Object.entries(error.details.fields).map(([key, value]) => [key, fieldErrorId(value)])));
      }
    }
    return "error";
  }
  return { errors, setErrors, clearError, validate, handleApiError };
}

function CompanyFields({ draft, setDraft, fields, disabled }: {
  draft: Draft; setDraft: (draft: Draft) => void; fields: ReturnType<typeof useFormFields>; disabled: boolean;
}) {
  const { dictionary: t } = useLocalization();
  const statuses: Record<CompanyStatus, string> = {
    new: t.statusNew, researching: t.statusResearching, contacted: t.statusContacted,
    qualified: t.statusQualified, rejected: t.statusRejected,
  };
  const inputClass = "w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 aria-invalid:border-red-700";
  return <div className="flex flex-col gap-5">
    <div className="flex flex-col gap-1.5">
      <label htmlFor="drawer-name" className="text-sm font-medium">{t.nameLabel}</label>
      <input id="drawer-name" value={draft.name} disabled={disabled} onChange={(event) => { setDraft({ ...draft, name: event.target.value }); fields.clearError("name"); }} aria-invalid={Boolean(fields.errors.name)} aria-describedby={fields.errors.name ? "drawer-name-error" : undefined} className={inputClass} />
      {fields.errors.name && <p id="drawer-name-error" className="text-sm text-red-800">{t[fields.errors.name]}</p>}
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="drawer-domain" className="text-sm font-medium">{t.domainLabel}</label>
      <input id="drawer-domain" value={draft.domain} disabled={disabled} onChange={(event) => { setDraft({ ...draft, domain: event.target.value }); fields.clearError("domain"); }} aria-invalid={Boolean(fields.errors.domain)} aria-describedby={fields.errors.domain ? "drawer-domain-error" : undefined} className={inputClass} />
      {fields.errors.domain && <p id="drawer-domain-error" className="text-sm text-red-800">{t[fields.errors.domain]}</p>}
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="drawer-status" className="text-sm font-medium">{t.statusFilter}</label>
      <select id="drawer-status" value={draft.status} disabled={disabled} onChange={(event) => { const status = COMPANY_STATUSES.find((item) => item === event.target.value); if (status) setDraft({ ...draft, status }); fields.clearError("status"); }} aria-invalid={Boolean(fields.errors.status)} aria-describedby={fields.errors.status ? "drawer-status-error" : undefined} className={inputClass}>
        {COMPANY_STATUSES.map((status) => <option key={status} value={status}>{statuses[status]}</option>)}
      </select>
      {fields.errors.status && <p id="drawer-status-error" className="text-sm text-red-800">{t[fields.errors.status]}</p>}
    </div>
  </div>;
}

const primaryButton = "rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900";
const secondaryButton = "rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900";

function CreateContent({ onCreated }: { onCreated: (id: string) => void }) {
  const { dictionary: t } = useLocalization();
  const { client } = useSession();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<"validation" | "saveError" | null>(null);
  const fields = useFormFields();
  const active = useRef(true);
  useEffect(() => { active.current = true; document.getElementById("drawer-name")?.focus(); return () => { active.current = false; }; }, []);
  const mutation = useMutation({
    mutationFn: (body: CreateCompanyRequest) => client.createCompany(body),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      void queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      if (active.current) onCreated(company.id);
    },
    onError: (error) => { if (active.current) { fields.handleApiError(error); setMessage(error instanceof ApiHttpError && error.status === 422 ? "validation" : "saveError"); } },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const value = fields.validate(draft);
    if (!value) { setMessage("validation"); return; }
    setMessage(null);
    mutation.mutate(value);
  }
  return <form onSubmit={submit} noValidate className="flex flex-col gap-6 p-6">
    <CompanyFields draft={draft} setDraft={setDraft} fields={fields} disabled={mutation.isPending} />
    {message && <p role="alert" className="text-sm text-red-800">{message === "validation" ? t.validationError : t.saveError}</p>}
    <SheetFooter><button type="submit" disabled={mutation.isPending} className={primaryButton}>{mutation.isPending ? t.saving : t.createAction}</button></SheetFooter>
  </form>;
}

function ReviewValues({ title, draft, version }: { title: string; draft: Draft; version: number }) {
  const { dictionary: t } = useLocalization();
  const status: Record<CompanyStatus, string> = {
    new: t.statusNew, researching: t.statusResearching, contacted: t.statusContacted,
    qualified: t.statusQualified, rejected: t.statusRejected,
  };
  return <div>
    <h4 className="mb-2 font-medium">{title}</h4>
    <dl className="flex flex-col gap-2">
      <div><dt className="text-stone-600">{t.nameLabel}</dt><dd>{draft.name}</dd></div>
      <div><dt className="text-stone-600">{t.domainLabel}</dt><dd>{draft.domain || t.missingDomain}</dd></div>
      <div><dt className="text-stone-600">{t.statusFilter}</dt><dd>{status[draft.status]}</dd></div>
      <div><dt className="text-stone-600">{t.versionLabel}</dt><dd>{version}</dd></div>
    </dl>
  </div>;
}

function DetailContent({ id }: { id: string }) {
  const { dictionary: t } = useLocalization();
  const { client, state: authState } = useSession();
  const query = useQuery({ ...createCompanyQueries(client).companyOptions(id), enabled: authState === "authenticated", retry: false });
  if (query.isPending) return <p role="status" className="p-6 text-sm">{t.loadingDetail}</p>;
  if (query.isError && !query.data) return <div className="flex flex-col items-start gap-3 p-6 text-sm" role="alert">
    <p>{query.error instanceof ApiHttpError && query.error.status === 404 ? t.detailMissing : t.detailError}</p>
    {!(query.error instanceof ApiHttpError && query.error.status === 404) && <button type="button" onClick={() => void query.refetch()} className={secondaryButton}>{t.retry}</button>}
  </div>;
  if (!query.data) return <p role="status" className="p-6 text-sm">{t.loadingDetail}</p>;
  return <EditForm key={id} id={id} initial={query.data} />;
}

function EditForm({ id, initial }: { id: string; initial: Company }) {
  const { dictionary: t, locale } = useLocalization();
  const { client } = useSession();
  const queryClient = useQueryClient();
  const queryOptions = createCompanyQueries(client).companyOptions(id);
  // Mount only after the first detail response; subsequent query updates cannot move this base.
  const [edit, setEdit] = useState<EditState>(() => startEdit(initial));
  const [message, setMessage] = useState<"validation" | "saveError" | "saveSuccess" | "conflict" | "reloadError" | null>(null);
  const [reloading, setReloading] = useState(false);
  const fields = useFormFields();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const mutation = useMutation({
    mutationFn: ({ base, body }: { base: Company; body: UpdateCompanyRequest }) => client.updateCompany(base.id, body),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      void queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      if (active.current) { setEdit(startEdit(company)); setMessage("saveSuccess"); }
    },
    onError: (error) => {
      if (!active.current) return;
      const kind = fields.handleApiError(error);
      if (kind === "conflict") {
        setEdit((previous) => ({ ...previous, phase: "conflict", latest: null }));
        setMessage("conflict");
      } else setMessage(error instanceof ApiHttpError && error.status === 422 ? "validation" : "saveError");
    },
  });
  async function loadLatest() {
    if (reloading) return;
    setReloading(true);
    try {
      await queryClient.invalidateQueries({ queryKey: companyKeys.detail(id), refetchType: "none" });
      const latest = await queryClient.fetchQuery({ ...queryOptions, staleTime: 0, retry: false });
      queryClient.setQueryData(companyKeys.detail(id), latest);
      if (active.current) { setEdit((previous) => ({ ...previous, phase: "review", latest })); setMessage(null); }
    } catch {
      if (active.current) setMessage("reloadError");
    } finally { if (active.current) setReloading(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending || edit.phase === "conflict" || edit.phase === "review") return;
    const value = fields.validate(edit.draft);
    if (!value) { setMessage("validation"); return; }
    setMessage(null);
    mutation.mutate({ base: edit.base, body: { ...value, if_version: edit.base.version } });
  }
  const { draft, base, phase, latest } = edit;
  const messageText = message === "validation" ? t.validationError : message === "saveError" ? t.saveError
    : message === "saveSuccess" ? t.saveSuccess : message === "conflict" ? t.conflictMessage
    : message === "reloadError" ? t.reloadError : null;
  const setDraft = (value: Draft) => setEdit((previous) => ({ ...previous, draft: value }));
  return <form onSubmit={submit} noValidate className="flex flex-col gap-6 p-6">
    <div className="border-b border-stone-200 pb-4 text-sm text-stone-600">
      <p className="font-medium text-stone-900">{base.name}</p>
      <p>{t.versionLabel} {base.version} · {t.columnCreated} {formatDate(base.created_at, locale)} · {t.updatedLabel} {formatDate(base.updated_at, locale)}</p>
    </div>
    <CompanyFields draft={draft} setDraft={setDraft} fields={fields} disabled={mutation.isPending || phase === "conflict" || phase === "review"} />
    {messageText && <p role={message === "saveSuccess" ? "status" : "alert"} className={`text-sm ${message === "saveSuccess" ? "text-green-800" : "text-red-800"}`}>{messageText}</p>}
    {phase === "conflict" && <button type="button" disabled={reloading} onClick={() => void loadLatest()} className={secondaryButton}>{reloading ? t.loadingDetail : t.loadLatest}</button>}
    {phase === "review" && latest && <section aria-label={t.reviewTitle} className="flex flex-col gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
      <h3 className="font-medium">{t.reviewTitle}</h3>
      <div className="grid grid-cols-2 gap-3">
        <ReviewValues title={t.savedValues} draft={fromCompany(latest)} version={latest.version} />
        <ReviewValues title={t.yourDraft} draft={draft} version={base.version} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setEdit(startEdit(latest)); setMessage(null); fields.setErrors({}); }} className={secondaryButton}>{t.useLatest}</button>
        <button type="button" onClick={() => { setEdit({ base: latest, draft, phase: "ready", latest: null }); setMessage(null); fields.setErrors({}); }} className={primaryButton}>{t.keepDraft}</button>
      </div>
    </section>}
    {(phase === "editing" || phase === "ready") && <SheetFooter><button type="submit" disabled={mutation.isPending} className={primaryButton}>{mutation.isPending ? t.saving : phase === "ready" ? t.saveAgain : t.saveCompany}</button></SheetFooter>}
  </form>;
}
