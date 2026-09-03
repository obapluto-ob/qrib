export const universities = [
  { dbId: 1, id: "uon", name: "University of Nairobi", city: "Nairobi", gateLat: -1.2792, gateLng: 36.8172 },
  { dbId: 2, id: "ku", name: "Kenyatta University", city: "Nairobi", gateLat: -1.1817, gateLng: 36.9356 },
  { dbId: 3, id: "jkuat", name: "Jomo Kenyatta University of Agriculture and Technology", city: "Kiambu", gateLat: -1.0916, gateLng: 37.0116 },
  { dbId: 4, id: "strathmore", name: "Strathmore University", city: "Nairobi", gateLat: -1.3006, gateLng: 36.8122 },
  { dbId: 5, id: "usiu", name: "United States International University - Africa", city: "Nairobi", gateLat: -1.2195, gateLng: 36.8876 },
  { dbId: 6, id: "moi", name: "Moi University", city: "Eldoret", gateLat: 0.5196, gateLng: 35.2697 },
  { dbId: 7, id: "egerton", name: "Egerton University", city: "Njoro", gateLat: -0.3683, gateLng: 35.9356 },
  { dbId: 8, id: "maseno", name: "Maseno University", city: "Kisumu", gateLat: -0.0046, gateLng: 34.5985 },
  { dbId: 9, id: "kisii", name: "Kisii University", city: "Kisii", gateLat: -0.6817, gateLng: 34.7667 },
  { dbId: 10, id: "maasai-mara", name: "Maasai Mara University", city: "Narok", gateLat: -1.0833, gateLng: 35.8700 },
  { dbId: 11, id: "mount-kenya", name: "Mount Kenya University", city: "Thika", gateLat: -1.0386, gateLng: 37.0833 },
  { dbId: 12, id: "daystar", name: "Daystar University", city: "Nairobi", gateLat: -1.3167, gateLng: 36.7833 },
  { dbId: 13, id: "cuea", name: "Catholic University of Eastern Africa", city: "Nairobi", gateLat: -1.3100, gateLng: 36.7750 },
  { dbId: 14, id: "africa-nazarene", name: "Africa Nazarene University", city: "Nairobi", gateLat: -1.3667, gateLng: 36.6833 },
  { dbId: 15, id: "university-of-embu", name: "University of Embu", city: "Embu", gateLat: -0.5311, gateLng: 37.4544 },
  { dbId: 16, id: "dedan-kimathi", name: "Dedan Kimathi University of Technology", city: "Nyeri", gateLat: -0.4167, gateLng: 36.9500 },
  { dbId: 17, id: "tuk", name: "Technical University of Kenya", city: "Nairobi", gateLat: -1.2833, gateLng: 36.8167 },
  { dbId: 18, id: "multimedia", name: "Multimedia University of Kenya", city: "Nairobi", gateLat: -1.2167, gateLng: 36.8833 },
  { dbId: 19, id: "kca", name: "KCA University", city: "Nairobi", gateLat: -1.2200, gateLng: 36.8900 },
  { dbId: 20, id: "riara", name: "Riara University", city: "Nairobi", gateLat: -1.3050, gateLng: 36.7700 },
  { dbId: 21, id: "st-pauls", name: "St. Paul's University", city: "Limuru", gateLat: -1.1047, gateLng: 36.6380 },
  { dbId: 22, id: "uoeld", name: "University of Eldoret", city: "Eldoret", gateLat: 0.5200, gateLng: 35.2800 },
  { dbId: 23, id: "machakos", name: "Machakos University", city: "Machakos", gateLat: -1.5167, gateLng: 37.2667 },
  { dbId: 24, id: "nakuru", name: "Nakuru University", city: "Nakuru", gateLat: -0.3031, gateLng: 36.0800 },
  { dbId: 25, id: "meru", name: "Meru University of Science and Technology", city: "Meru", gateLat: 0.0462, gateLng: 37.6553 },
  { dbId: 26, id: "mku", name: "Murang'a University of Technology", city: "Murang'a", gateLat: -0.7210, gateLng: 37.1526 },
  { dbId: 27, id: "cooperative", name: "Co-operative University of Kenya", city: "Nairobi", gateLat: -1.3667, gateLng: 36.6833 },
  { dbId: 28, id: "karatina", name: "Karatina University", city: "Karatina", gateLat: -0.4830, gateLng: 37.1324 },
];

export function resolveUniversityId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericId = Number(value);
  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId;
  }

  const selected = universities.find(
    (university) => university.id === String(value).toLowerCase()
  );

  return selected ? selected.dbId : null;
}

export function getUniversity(id) {
  const numericId = Number(id);

  return universities.find(
    (university) =>
      university.id === String(id).toLowerCase() ||
      university.dbId === numericId ||
      university.id === id
  );
}
