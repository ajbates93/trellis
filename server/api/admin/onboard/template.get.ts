export default defineEventHandler(async (event) => {
  // CSV template format
  const template = `email,name,roleType,buddyEmail,nextReviewDate
john.doe@pocketworks.co.uk,John Doe,dev,jane.smith@pocketworks.co.uk,2025-06-15
jane.smith@pocketworks.co.uk,Jane Smith,design,,2025-07-20
lucy.brown@pocketworks.co.uk,Lucy Brown,growth,john.doe@pocketworks.co.uk,2025-08-01`;

  // Set headers for CSV download
  setResponseHeaders(event, {
    "Content-Type": "text/csv",
    "Content-Disposition": 'attachment; filename="cohort-user-import-template.csv"',
  });

  return template;
});
