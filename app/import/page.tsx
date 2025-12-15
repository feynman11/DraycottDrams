"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [clearExisting, setClearExisting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    errors: string[];
    imported: number;
  } | null>(null);

  // Redirect if not a member
  useEffect(() => {
    if (status === "authenticated" && session && !session.user?.member) {
      router.push("/");
    }
  }, [session, status, router]);

  const { data: templateData, isLoading: templateLoading } = api.import.getTemplate.useQuery(undefined, {
    enabled: !!session?.user?.member,
  });
  const importMutation = api.import.importCSV.useMutation({
    onSuccess: (data) => {
      setImportStatus(data);
      if (data.success) {
        setFile(null);
        setCsvText("");
      }
    },
    onError: (error) => {
      setImportStatus({
        success: false,
        errors: [error.message],
        imported: 0,
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportStatus(null);

    // Read file content
    const text = await selectedFile.text();
    setCsvText(text);
  };

  const handleImport = () => {
    if (!csvText.trim()) {
      setImportStatus({
        success: false,
        errors: ["Please select a file first"],
        imported: 0,
      });
      return;
    }

    importMutation.mutate({
      csvText,
      clearExisting,
    });
  };

  const handleDownloadTemplate = () => {
    if (!templateData?.csv) return;

    const blob = new Blob([templateData.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whisky-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  // Show unauthorized message if not a member
  if (status === "authenticated" && session && !session.user?.member) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">Access Denied</h2>
            <p className="text-slate-400">You must be a member to access the import page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">Import Whisky Data</h1>
          <p className="text-slate-400">
            Upload a CSV file to import whisky tasting data into the database.
          </p>
        </div>

        {/* Template Download Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-amber-400 mb-2">Download Template</h2>
              <p className="text-slate-400 text-sm">
                Download a blank CSV template with the correct format and example data.
              </p>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              disabled={templateLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {templateLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Template
            </Button>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-amber-400 mb-4">Upload CSV File</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select CSV File
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                {file && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    <span className="text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </div>

            {csvText && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  File Preview (first 500 characters)
                </label>
                <pre className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-auto max-h-40">
                  {csvText.substring(0, 500)}
                  {csvText.length > 500 && "..."}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clearExisting"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="clearExisting" className="text-sm text-slate-300">
                Clear existing data before importing (⚠️ This will delete all current whisky entries)
              </label>
            </div>

            <Button
              onClick={handleImport}
              disabled={!csvText || importMutation.isPending}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Import Status */}
        {importStatus && (
          <div
            className={`border rounded-lg p-6 ${
              importStatus.success
                ? "bg-green-950/50 border-green-800"
                : "bg-red-950/50 border-red-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {importStatus.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold mb-2 ${
                    importStatus.success ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {importStatus.success
                    ? `Successfully imported ${importStatus.imported} whiskies!`
                    : "Import Failed"}
                </h3>
                {importStatus.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-300 mb-2">Errors:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                      {importStatus.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-amber-400 mb-4">Import Instructions</h2>
          <div className="space-y-2 text-sm text-slate-400">
            <p>1. Download the template CSV file using the button above</p>
            <p>2. Fill in your whisky data following the template format</p>
            <p>3. Required columns: Gathering, Theme, Date, Provider, Country, Region, Distillery, Variety, ABV, Host, Notes</p>
            <p>4. Date format: "DD Month YYYY" (e.g., "15 November 2019")</p>
            <p>5. ABV format: "XX.X%" (e.g., "46.0%")</p>
            <p>6. Upload your completed CSV file</p>
            <p className="text-amber-500 mt-4">
              ⚠️ Note: Coordinates are not included in the CSV import. They will need to be set separately or via the distillery lookup system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


