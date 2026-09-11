import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
export type Complaint = Record<string, string>;
export type Assessment = {
  severity: string;
  priority: string;
  rationale: string;
  action: string;
  missing: string[];
  completeness: number;
  root_cause: string[];
  capa: string[];
  summary: string;
  disclaimer: string;
};
export type LedgerRecord = {
  id: string;
  created_at: string;
  status: string;
  complaint: Complaint;
  assessment: Assessment;
  audit: { event: string; actor: string; at: string; note?: string }[];
};
export type Result = {
  complaint: Complaint;
  assessment: Assessment;
  message: string;
  mode: string;
  trace: string[];
  duplicates: { id: string; status: string }[];
};
export const blank: Complaint = Object.fromEntries(
  [
    "source",
    "customer",
    "product",
    "strength",
    "batch",
    "quantity",
    "manufacturing_date",
    "expiry_date",
    "site",
    "materials",
    "category",
    "description",
  ].map((k) => [k, ""]),
);
const initialState = {
  draft: { ...blank },
  assessment: null as Assessment | null,
  duplicates: [] as Result["duplicates"],
  messages: [
    {
      role: "assistant",
      text: "Bring the complaint. I’ll help connect the details. Paste a report, upload a document, or start with a sample.",
    },
  ],
  busy: false,
  error: "",
  records: [] as LedgerRecord[],
  trace: [] as string[],
  reviewed: false,
  requestId: crypto.randomUUID(),
};
const slice = createSlice({
  name: "complaints",
  initialState,
  reducers: {
    edit(s, a: PayloadAction<{ key: string; value: string }>) {
      s.draft[a.payload.key] = a.payload.value;
      s.assessment = null;
      s.reviewed = false;
      s.duplicates = [];
      s.requestId = crypto.randomUUID();
    },
    begin(s, a: PayloadAction<string>) {
      s.busy = true;
      s.error = "";
      s.messages.push({ role: "user", text: a.payload });
    },
    complete(s, a: PayloadAction<Result>) {
      s.busy = false;
      s.draft = a.payload.complaint;
      s.assessment = a.payload.assessment;
      s.duplicates = a.payload.duplicates;
      s.trace = a.payload.trace;
      s.messages.push({ role: "assistant", text: a.payload.message });
      s.reviewed = false;
      s.requestId = crypto.randomUUID();
    },
    fail(s, a: PayloadAction<string>) {
      s.busy = false;
      s.error = a.payload;
    },
    assessed(
      s,
      a: PayloadAction<{
        assessment: Assessment;
        duplicates: Result["duplicates"];
      }>,
    ) {
      s.assessment = a.payload.assessment;
      s.duplicates = a.payload.duplicates;
      s.busy = false;
    },
    setBusy(s, a: PayloadAction<boolean>) {
      s.busy = a.payload;
      s.error = "";
    },
    review(s, a: PayloadAction<boolean>) {
      s.reviewed = a.payload;
    },
    records(s, a: PayloadAction<LedgerRecord[]>) {
      s.records = a.payload;
    },
    reset() {
      return {
        ...initialState,
        draft: { ...blank },
        messages: [...initialState.messages],
        requestId: crypto.randomUUID(),
      };
    },
  },
});
export const actions = slice.actions;
export const store = configureStore({ reducer: { complaints: slice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api" + path, options);
  if (!response.ok) {
    let message = "Request failed. Please retry.";
    try {
      const d = await response.json();
      message =
        typeof d.detail === "string"
          ? d.detail
          : "Check the required fields and try again.";
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
export const json = (body: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
