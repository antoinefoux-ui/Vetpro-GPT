import { db } from "../store/inMemoryDb.js";
import type { ImagingRecord, LabRecord, SurgeryRecord, VaccineRecord } from "../types/domain.js";
import { makeId } from "../utils/id.js";

function ensurePet(petId: string) {
  const pet = db.pets.find((p) => p.id === petId);
  if (!pet) throw new Error("Pet not found");
}

export function listClinicalByPet(petId: string): {
  vaccines: VaccineRecord[];
  labs: LabRecord[];
  imaging: ImagingRecord[];
  surgeries: SurgeryRecord[];
} {
  ensurePet(petId);
  return {
    vaccines: db.vaccines.filter((v) => v.petId === petId),
    labs: db.labs.filter((l) => l.petId === petId),
    imaging: db.imaging.filter((i) => i.petId === petId),
    surgeries: db.surgeries.filter((s) => s.petId === petId)
  };
}

export function createVaccine(input: Omit<VaccineRecord, "id">): VaccineRecord {
  ensurePet(input.petId);
  const row: VaccineRecord = { ...input, id: makeId("vac") };
  db.vaccines.push(row);
  return row;
}

export function createLab(input: Omit<LabRecord, "id">): LabRecord {
  ensurePet(input.petId);
  const row: LabRecord = { ...input, id: makeId("lab") };
  db.labs.push(row);
  return row;
}

export function createImaging(input: Omit<ImagingRecord, "id">): ImagingRecord {
  ensurePet(input.petId);
  const row: ImagingRecord = { ...input, id: makeId("img") };
  db.imaging.push(row);
  return row;
}

export function createSurgery(input: Omit<SurgeryRecord, "id">): SurgeryRecord {
  ensurePet(input.petId);
  const row: SurgeryRecord = { ...input, id: makeId("srg") };
  db.surgeries.push(row);
  return row;
}
