import { writeFileSync } from "node:fs";
export default function(pi) {
  pi.registerCommand("capture-confirm", {
    description: "Confirm a harmless marker in the disposable capture workspace",
    handler: async (_args, ctx) => {
      const approved = await ctx.ui.confirm("Herdboard capture probe", "Create capture-marker.txt in this disposable workspace?");
      if (approved) writeFileSync("capture-marker.txt", "approved\n");
      ctx.ui.notify(approved ? "Probe approved; marker created" : "Probe declined; marker absent", "info");
    }
  });
}
