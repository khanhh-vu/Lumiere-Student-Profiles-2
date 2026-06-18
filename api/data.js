export default async function handler(req, res) {
  const BASE_ID  = "appOhh4711y4cXSfj";
  const TABLE_ID = "tbl86VUnRDEiBphrL";
  const TOKEN    = process.env.AIRTABLE_TOKEN;

  const FIELDS = [
    "Student Name", "Cohort of Program", "Graduation Year",
    "Journal of Acceptance (Text)", "PM: Research Question",
    "Research Field", "Country", "Vertical", "ISEF Status",
    "Link to Publication", "ISEF Publication Link"
  ];

  const REC_ID_RE = /^rec[A-Za-z0-9]{14}$/;
  const clean = val => {
    if (Array.isArray(val)) val = val.join(", ");
    val = (val || "").toString().trim();
    return REC_ID_RE.test(val) ? "" : val;
  };

  let records = [], offset;
  do {
    const params = new URLSearchParams({
      filterByFormula: "{Profile Status}='Accepted'",
      pageSize: "100",
      ...(offset && { offset }),
    });
    FIELDS.forEach(f => params.append("fields[]", f));

    const resp = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!resp.ok) return res.status(502).json({ error: "Airtable error" });

    const body = await resp.json();
    for (const rec of body.records || []) {
      const f = rec.fields;
      records.push({
        id:                  rec.id,
        studentName:         clean(f["Student Name"]),
        cohort:              clean(f["Cohort of Program"]),
        graduationYear:      f["Graduation Year"] || "",
        journal:             clean(f["Journal of Acceptance (Text)"]),
        researchQuestion:    clean(f["PM: Research Question"]),
        mentorField:         clean(f["Research Field"]),
        country:             clean(f["Country"]),
        vertical:            clean(f["Vertical"]),
        isefStatus:          clean(f["ISEF Status"]),
        publicationLink:     clean(f["Link to Publication"]),
        isefPublicationLink: clean(f["ISEF Publication Link"]),
      });
    }
    offset = body.offset;
  } while (offset);

  // Cache for 5 minutes so you don't hammer Airtable's API
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  res.status(200).json({ updatedAt: new Date().toISOString(), students: records });
}
