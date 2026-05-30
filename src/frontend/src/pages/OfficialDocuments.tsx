import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  BookOpen,
  Eye,
  FileText,
  Loader2,
  Printer,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { OfficialDocumentMeta } from "../hooks/useQueries";
import {
  useAddOfficialDocMeta,
  useDeleteOfficialDocMeta,
  useOfficialDocMetas,
} from "../hooks/useQueries";
import {
  dataUrlToBlobUrl,
  formatFileSize,
  getFileDataUrl,
  uploadFile,
} from "../utils/objectStorageUtils";
import { getCurrentConstituency } from "../utils/storage";

const CATEGORIES = [
  { value: "पत्र", label: "पत्र (Letter)" },
  { value: "आदेश", label: "आदेश (Order)" },
  { value: "शासन निर्णय", label: "शासन निर्णय (GR)" },
  { value: "परिपत्रक", label: "परिपत्रक (Circular)" },
  { value: "इतर", label: "इतर (Other)" },
];

const CATEGORY_COLORS: Record<string, string> = {
  पत्र: "bg-blue-100 text-blue-800 border-blue-300",
  आदेश: "bg-red-100 text-red-800 border-red-300",
  "शासन निर्णय": "bg-purple-100 text-purple-800 border-purple-300",
  परिपत्रक: "bg-green-100 text-green-800 border-green-300",
  इतर: "bg-gray-100 text-gray-700 border-gray-300",
};

function openDocByFileKey(fileKey: string) {
  const dataUrl = getFileDataUrl(fileKey);
  if (!dataUrl) {
    toast.error("फाईल उपलब्ध नाही. फाईल पुन्हा upload करा.");
    return;
  }
  const blobUrl = dataUrlToBlobUrl(dataUrl);
  if (!blobUrl) {
    toast.error("PDF उघडताना त्रुटी आली");
    return;
  }
  window.open(blobUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

function printDocByFileKey(fileKey: string) {
  const dataUrl = getFileDataUrl(fileKey);
  if (!dataUrl) {
    toast.error("फाईल उपलब्ध नाही. फाईल पुन्हा upload करा.");
    return;
  }
  const blobUrl = dataUrlToBlobUrl(dataUrl);
  if (!blobUrl) {
    toast.error("प्रिंट करताना त्रुटी आली");
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    }, 5000);
  };
}

function UploadDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    category: string,
    fileKey: string,
    fileSize: number,
  ) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("आदेश");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setCategory("आदेश");
    setFileName("");
    setFileSize(0);
    setSelectedFile(null);
    setUploading(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("फक्त PDF फाईल स्वीकारली जाईल");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("फाईल आकार १० MB पेक्षा जास्त नसावा");
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""));
  }

  async function handleSave() {
    if (!title.trim() || !selectedFile) return;
    setUploading(true);
    try {
      const fileKey = await uploadFile(selectedFile);
      onSave(title.trim(), category, fileKey, selectedFile.size);
      reset();
    } catch {
      toast.error("फाईल upload करताना त्रुटी आली");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md" data-ocid="documents.upload.dialog">
        <DialogHeader>
          <DialogTitle>📄 नवीन दस्तऐवज जोडा</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">शीर्षक *</Label>
            <Input
              className="mt-1 h-9"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="दस्तऐवजाचे नाव टाका"
              data-ocid="documents.upload.title.input"
            />
          </div>
          <div>
            <Label className="text-xs">प्रकार *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="mt-1 h-9"
                data-ocid="documents.upload.category.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">PDF फाईल *</Label>
            <div className="mt-1">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFile}
                data-ocid="documents.upload_button"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-md text-sm hover:bg-muted/40 transition-colors w-full justify-center"
              >
                <Upload size={16} />
                {uploading ? "Upload होत आहे..." : "PDF निवडा"}
              </button>
              {fileName && (
                <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                  <FileText size={12} />
                  {fileName} ({formatFileSize(fileSize)})
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
            data-ocid="documents.upload.cancel_button"
          >
            रद्द करा
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!title.trim() || !selectedFile || uploading}
            data-ocid="documents.upload.submit_button"
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1" />
                जतन होत आहे...
              </>
            ) : (
              "जतन करा"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OfficialDocuments({
  isAdminLoggedIn,
  isSupMode,
  isNodalMode,
}: {
  isAdminLoggedIn?: boolean;
  isSupMode?: boolean;
  isNodalMode?: boolean;
}) {
  const constituency = getCurrentConstituency() || "211";
  const { data: docs = [], isLoading } = useOfficialDocMetas(constituency);
  const addDocMeta = useAddOfficialDocMeta();
  const deleteDocMeta = useDeleteOfficialDocMeta();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OfficialDocumentMeta | null>(
    null,
  );

  async function handleSave(
    name: string,
    category: string,
    fileKey: string,
    _fileSize: number,
  ) {
    const meta: OfficialDocumentMeta = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      category,
      uploadDate: BigInt(Date.now()),
      uploadedBy: "मुख्य प्रशासक",
      fileKey,
      constituency,
    };
    try {
      await addDocMeta.mutateAsync(meta);
      setUploadOpen(false);
      toast.success("दस्तऐवज यशस्वीरित्या जोडला");
    } catch (err) {
      toast.error(
        `जोडताना त्रुटी आली: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocMeta.mutateAsync({ id, constituency });
      setDeleteTarget(null);
      toast.success("दस्तऐवज हटवला");
    } catch (err) {
      toast.error(
        `हटवताना त्रुटी आली: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const filtered = docs.filter((d) => {
    const matchSearch =
      !search.trim() || d.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchCat;
  });

  function formatUploadDate(ts: bigint): string {
    try {
      return new Date(Number(ts)).toLocaleDateString("mr-IN");
    } catch {
      return "—";
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            शासकीय दस्तऐवज
          </h2>
          <p className="text-sm text-muted-foreground">
            एकूण {docs.length} दस्तऐवज
          </p>
        </div>
        {isAdminLoggedIn && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setUploadOpen(true)}
            data-ocid="documents.add.open_modal_button"
          >
            <Upload size={14} />📄 नवीन दस्तऐवज जोडा
          </Button>
        )}
      </div>

      {/* Supervisor / Nodal info banner */}
      {(isSupMode || isNodalMode) && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-sm text-yellow-800">
          <BookOpen size={15} className="flex-shrink-0" />
          हे दस्तऐवज केवळ वाचण्यासाठी उपलब्ध आहेत. आपण PDF पाहू शकता आणि प्रिंट काढू शकता.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="दस्तऐवज शोधा..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="documents.search_input"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger
            className="h-8 text-sm w-44"
            data-ocid="documents.category_filter.select"
          >
            <SelectValue placeholder="सर्व प्रकार" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">सर्व प्रकार</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">दस्तऐवज लोड होत आहेत...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold w-12">
                  क्र.
                </TableHead>
                <TableHead className="text-xs font-semibold">शीर्षक</TableHead>
                <TableHead className="text-xs font-semibold">प्रकार</TableHead>
                <TableHead className="text-xs font-semibold">दिनांक</TableHead>
                <TableHead className="text-xs font-semibold">
                  अपलोड केलेले
                </TableHead>
                <TableHead className="text-xs font-semibold">क्रिया</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-14 text-muted-foreground"
                    data-ocid="documents.empty_state"
                  >
                    <AlertCircle
                      size={28}
                      className="mx-auto mb-2 opacity-30"
                    />
                    <p className="text-sm">
                      {docs.length === 0
                        ? isAdminLoggedIn
                          ? 'अद्याप कोणताही दस्तऐवज जोडला नाही. "नवीन दस्तऐवज जोडा" बटण दाबा.'
                          : "अद्याप कोणताही दस्तऐवज उपलब्ध नाही."
                        : "शोध निकष जुळणारे दस्तऐवज सापडले नाहीत"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc, idx) => (
                  <TableRow
                    key={doc.id}
                    data-ocid={`documents.item.${idx + 1}`}
                    className="hover:bg-muted/20"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-start gap-2">
                        <FileText
                          size={14}
                          className="text-red-500 flex-shrink-0 mt-0.5"
                        />
                        <p className="font-medium leading-tight min-w-0 truncate">
                          {doc.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${CATEGORY_COLORS[doc.category] || "bg-gray-100 text-gray-700"}`}
                      >
                        {doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatUploadDate(doc.uploadDate)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {doc.uploadedBy}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700"
                          onClick={() => openDocByFileKey(doc.fileKey)}
                          title="पाहा"
                          data-ocid={`documents.view.button.${idx + 1}`}
                        >
                          <Eye size={13} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          onClick={() => printDocByFileKey(doc.fileKey)}
                          title="प्रिंट"
                          data-ocid={`documents.print.button.${idx + 1}`}
                        >
                          <Printer size={13} />
                        </Button>
                        {isAdminLoggedIn && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(doc)}
                            title="हटवा"
                            data-ocid={`documents.delete_button.${idx + 1}`}
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Upload Dialog (admin only) */}
      {isAdminLoggedIn && (
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
        >
          <DialogContent
            className="max-w-sm"
            data-ocid="documents.delete.dialog"
          >
            <DialogHeader>
              <DialogTitle className="text-destructive">
                दस्तऐवज हटवा?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm">
              <strong>{deleteTarget.name}</strong> हा दस्तऐवज कायमचा हटवला जाईल.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                data-ocid="documents.delete.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(deleteTarget.id)}
                data-ocid="documents.delete.confirm_button"
              >
                हटवा
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
