export default defineEventHandler(async (event) => {
  // CSV template format
  const template = `email,name,roleType,buddyEmail
john.doe@pocketworks.co.uk,John Doe,dev,jane.smith@pocketworks.co.uk
jane.smith@pocketworks.co.uk,Jane Smith,design,
lucy.brown@pocketworks.co.uk,Lucy Brown,growth,john.doe@pocketworks.co.uk
mike.johnson@pocketworks.co.uk,Mike Johnson,management,`;

  // Set headers for CSV download
  setResponseHeaders(event, {
    "Content-Type": "text/csv",
    "Content-Disposition": 'attachment; filename="cohort-user-import-template.csv"',
  });

  return template;
});
