<template>
  <UDashboardPanel id="admin-onboard">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Header -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-heroicons-arrow-up-tray" class="text-purple-500 text-3xl" />
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                CSV Onboarding
              </h1>
            </div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Bulk import users to get your team started quickly
            </p>
          </div>
          <UButton
icon="i-heroicons-arrow-down-tray" variant="solid" :loading="downloadingTemplate"
            @click="downloadTemplate">
            Download Template
          </UButton>
        </div>

        <!-- Instructions Card -->
        <UCard class="mb-8">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-information-circle" class="text-blue-500" />
              <h3 class="text-lg font-semibold">CSV Format Instructions</h3>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <h4 class="font-semibold mb-2">Required Fields</h4>
              <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>
                  <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">email</code>
                  - Must be @pocketworks.co.uk domain
                </li>
                <li>
                  <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">name</code>
                  - Full name of the user
                </li>
              </ul>
            </div>

            <div>
              <h4 class="font-semibold mb-2">Optional Fields</h4>
              <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>
                  <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">roleType</code>
                  - dev, design, qa, growth, or management
                </li>
                <li>
                  <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">buddyEmail</code>
                  - Email of assigned buddy (must exist in system)
                </li>
              </ul>
            </div>

            <UAlert
icon="i-heroicons-light-bulb" color="primary" variant="soft" title="User Linking"
              description="Imported users are pre-created with emailVerified=false. When they first log in via Google OAuth, their accounts will automatically link and preserve all buddy assignments and relationships." />
          </div>
        </UCard>

        <!-- Upload Section -->
        <UCard class="mb-8">
          <template #header>
            <h3 class="text-lg font-semibold">Upload CSV File</h3>
          </template>

          <div class="space-y-4">
            <!-- File Input -->
            <div
              class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
              :class="{
                'border-blue-500 bg-blue-50 dark:bg-blue-950': isDragging,
              }" @click="triggerFileInput" @dragover.prevent="isDragging = true" @dragleave="isDragging = false"
              @drop.prevent="handleFileDrop">
              <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileSelect" >
              <UIcon name="i-heroicons-document-arrow-up" class="mx-auto text-4xl text-gray-400 mb-4" />
              <p class="text-gray-600 dark:text-gray-400 mb-2">
                {{
                  selectedFile
                    ? selectedFile.name
                    : "Click to upload or drag and drop"
                }}
              </p>
              <p class="text-sm text-gray-500">CSV files only</p>
            </div>

            <!-- File Preview -->
            <div v-if="csvPreview" class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold">Preview</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ csvPreview.rows.length }} rows detected
                  </p>
                </div>
                <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="clearFile">
                  Clear
                </UButton>
              </div>

              <!-- Preview Table -->
              <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        #
                      </th>
                      <th
v-for="header in csvPreview.headers" :key="header"
                        class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {{ header }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="(row, index) in csvPreview.rows.slice(0, 5)" :key="index">
                      <td class="px-4 py-2 text-sm text-gray-500">
                        {{ index + 1 }}
                      </td>
                      <td
v-for="header in csvPreview.headers" :key="header"
                        class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {{ row[header] || "-" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="csvPreview.rows.length > 5" class="text-sm text-gray-500 text-center">
                Showing first 5 of {{ csvPreview.rows.length }} rows
              </p>
            </div>

            <!-- Action Buttons -->
            <div v-if="selectedFile" class="flex gap-3">
              <UButton
icon="i-heroicons-arrow-up-tray" color="primary" :loading="importing" :disabled="!csvPreview"
                @click="importCSV">
                Import Users
              </UButton>
              <UButton icon="i-heroicons-x-mark" color="neutral" variant="soft" @click="clearFile">
                Cancel
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Results Section -->
        <UCard v-if="importResult" class="mb-8">
          <template #header>
            <h3 class="text-lg font-semibold">Import Results</h3>
          </template>

          <div class="space-y-4">
            <!-- Success Message -->
            <UAlert
v-if="importResult.success" icon="i-heroicons-check-circle" color="success" variant="soft"
              :title="`Successfully imported ${importResult.imported} users`" :description="importResult.errors?.length > 0
                ? `${importResult.errors.length} warnings during import`
                : 'All users imported without issues'
                " />

            <!-- Error Message -->
            <UAlert
v-else icon="i-heroicons-x-circle" color="error" variant="soft" title="Import failed"
              :description="`${importResult.errors?.length || 0} errors found. Please fix them and try again.`" />

            <!-- Error List -->
            <div v-if="importResult.errors && importResult.errors.length > 0" class="space-y-2">
              <h4 class="font-semibold">Errors and Warnings</h4>
              <div class="max-h-64 overflow-y-auto space-y-2">
                <UAlert
v-for="(error, index) in importResult.errors" :key="index"
                  icon="i-heroicons-exclamation-triangle" color="warning" variant="soft"
                  :title="`Row ${error.row}: ${error.field}`" :description="error.message" size="xs" />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <UButton v-if="importResult.success" icon="i-heroicons-check" color="primary" @click="finishImport">
                Done
              </UButton>
              <UButton v-else icon="i-heroicons-arrow-path" color="primary" @click="clearResults">
                Try Again
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Import History -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Import History</h3>
              <UButton
icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="sm" :loading="loadingHistory"
                @click="fetchHistory">
                Refresh
              </UButton>
            </div>
          </template>

          <div v-if="loadingHistory" class="text-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
          </div>

          <div v-else-if="importHistory.length === 0" class="text-center py-8 text-gray-500">
            No import history yet
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filename
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Admin
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rows
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="item in importHistory" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td class="px-4 py-3 text-sm">
                    {{ formatDate(item.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-sm">{{ item.filename }}</td>
                  <td class="px-4 py-3 text-sm">
                    <div>{{ item.adminName }}</div>
                    <div class="text-xs text-gray-500">
                      {{ item.adminEmail }}
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <UBadge :color="item.status === 'completed' ? 'success' : 'error'" variant="soft">
                      {{ item.status }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3 text-sm">{{ item.rowsImported }}</td>
                  <td class="px-4 py-3 text-sm">
                    <UButton
v-if="item.errorLog" icon="i-heroicons-exclamation-circle" color="neutral" variant="ghost"
                      size="xs" @click="viewErrors(item)">
                      View Errors
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Error Log Modal -->
  <UModal v-model:open="showErrorModal" title="Import Errors">
    <template #body>
      <div v-if="selectedErrorLog" class="space-y-2 max-h-96 overflow-y-auto">
        <UAlert
v-for="(error, index) in selectedErrorLog" :key="index" icon="i-heroicons-exclamation-triangle"
          color="warning" variant="soft" :title="`Row ${error.row}: ${error.field}`" :description="error.message"
          size="xs" />
      </div>
    </template>

    <template #footer>
      <UButton @click="showErrorModal = false">Close</UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Onboarding",
});

interface CSVPreview {
  headers: string[];
  rows: Record<string, string>[];
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors?: ImportError[];
}

interface ImportHistoryItem {
  id: string;
  filename: string;
  rowsImported: number;
  status: string;
  errorLog: string | null;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const csvPreview = ref<CSVPreview | null>(null);
const isDragging = ref(false);
const importing = ref(false);
const importResult = ref<ImportResult | null>(null);
const downloadingTemplate = ref(false);

const importHistory = ref<ImportHistoryItem[]>([]);
const loadingHistory = ref(false);
const showErrorModal = ref(false);
const selectedErrorLog = ref<ImportError[] | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    processFile(target.files[0]);
  }
};

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0];
    if (file.name.endsWith(".csv")) {
      processFile(file);
    }
  }
};

const processFile = (file: File) => {
  selectedFile.value = file;

  // Read and parse CSV
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    parseCSV(text);
  };
  reader.readAsText(file);
};

const parseCSV = (text: string) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    csvPreview.value = null;
    return;
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row);
  }

  csvPreview.value = { headers, rows };
};

const clearFile = () => {
  selectedFile.value = null;
  csvPreview.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const importCSV = async () => {
  if (!selectedFile.value || !csvPreview.value) return;

  importing.value = true;
  importResult.value = null;

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;

      try {
        const result = await $api("/admin/onboard/import", {
          method: "POST",
          body: {
            csvContent,
            filename: selectedFile.value?.name,
          },
        });

        importResult.value = result as ImportResult;
      } catch (error) {
        importResult.value = {
          success: false,
          imported: 0,
          errors: [
            {
              row: 0,
              field: "system",
              message: (error as Error).message || "Failed to import CSV",
            },
          ],
        };
      } finally {
        importing.value = false;
      }
    };
    reader.readAsText(selectedFile.value);
  } catch (error) {
    importing.value = false;
  }
};

const clearResults = () => {
  importResult.value = null;
};

const finishImport = () => {
  clearFile();
  clearResults();
  fetchHistory();
};

const downloadTemplate = async () => {
  downloadingTemplate.value = true;
  try {
    const blob = await $api("/admin/onboard/template", {
      method: "GET",
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([blob as string]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "trellis-user-import-template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Failed to download template:", error);
  } finally {
    downloadingTemplate.value = false;
  }
};

const fetchHistory = async () => {
  loadingHistory.value = true;
  try {
    const data = await $api<{ imports: ImportHistoryItem[] }>(
      "/admin/onboard/history",
    );
    if (data) {
      importHistory.value = data.imports;
    }
  } catch (error) {
    console.error("Failed to fetch import history:", error);
  } finally {
    loadingHistory.value = false;
  }
};

const viewErrors = (item: ImportHistoryItem) => {
  if (item.errorLog) {
    try {
      selectedErrorLog.value = JSON.parse(item.errorLog);
      showErrorModal.value = true;
    } catch (error) {
      console.error("Failed to parse error log:", error);
    }
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Initial load
onMounted(() => {
  fetchHistory();
});
</script>
