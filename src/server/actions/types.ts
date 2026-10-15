export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Echo of submitted text values so a failed submission doesn't clear the form. */
  values?: Record<string, string>;
  /** Changes on every submission; used as a React key to re-apply default values. */
  attempt?: number;
};

export const idleState: ActionState = { status: "idle" };

export function echoValues(formData: FormData, omit: string[] = []) {
  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$") && !omit.includes(k)) values[k] = v;
  return values;
}
