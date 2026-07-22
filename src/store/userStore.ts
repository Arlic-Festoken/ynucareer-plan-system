import { create } from "zustand";
import { students } from "../data/mockData";
import type { StudentProfile, UserRole } from "../types";

type UserState = {
  role: UserRole;
  student: StudentProfile;
  setRole: (role: UserRole) => void;
};

export const useUserStore = create<UserState>((set) => ({
  role: "freshman",
  student: students.freshman,
  setRole: (role) => {
    const student = role === "junior" ? students.junior : students.freshman;
    set({ role, student });
  },
}));
