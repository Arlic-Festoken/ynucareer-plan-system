import { createPilotService } from "./pilot-service.mjs";

function requireTeacher(user) {
  if (!user || user.role !== "teacher") throw new Error("teacher_access_required");
}

export function createOpportunityService(database, options = {}) {
  const pilot = options.pilotService ?? createPilotService(database, options);
  return {
    pilot,
    listForStudent(user) {
      return pilot.listForStudent(user);
    },
    saveParticipation(user, opportunityId, input) {
      const normalized = input?.status === "completed"
        ? { ...input, status: "submitted", reflection: input?.reflection || input?.evidenceNote || "" }
        : input;
      return pilot.saveParticipation(user, opportunityId, normalized);
    },
    listForTeacher(user) {
      requireTeacher(user);
      return pilot.listForStaff(user);
    },
    create(user, input) {
      requireTeacher(user);
      return pilot.createLegacyPublished(user, input);
    },
    setStatus(user, opportunityId, input) {
      requireTeacher(user);
      const status = input?.status === "open" ? "published" : input?.status;
      return pilot.setOpportunityStatus(user, opportunityId, { status });
    },
  };
}
