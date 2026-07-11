"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Search,
  Grid,
  List,
  UploadCloud,
  Eye,
  Download,
  History,
  Edit2,
  Trash2,
  Lock,
  Calendar,
  Tag as TagIcon,
  X,
  Plus,
  Loader2,
  Check,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";
import { ConfirmDialog } from "./ConfirmDialog";
import { CustomSelect } from "./CustomSelect";
import { AnimatePresence, motion } from "framer-motion";

interface DocumentTag {
  id: string;
  name: string;
}

interface DocumentCategory {
  id: string;
  name: string;
  isCustom: boolean;
}

interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  uploadedBy: string;
  createdAt: string;
}

interface DocumentDetail {
  id: string;
  fileName: string;
  originalName: string;
  categoryId: string;
  category: DocumentCategory;
  description: string | null;
  fileType: string;
  fileSize: number;
  uploadedBy: string | null;
  downloadUrl: string;
  previewUrl: string | null;
  expiryDate: string | null;
  version: number;
  isConfidential: boolean;
  tags: DocumentTag[];
  versions: DocumentVersion[];
  createdAt: string;
}

interface DocumentManagerProps {
  employeeId: string;
}

export function DocumentManager({ employeeId }: DocumentManagerProps) {
  // Lists
  const [documents, setDocuments] = useState<DocumentDetail[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedExpiry, setSelectedExpiry] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals & Panels
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentDetail | null>(null);
  const [versionDrawerDoc, setVersionDrawerDoc] = useState<DocumentDetail | null>(
    null,
  );
  const [editMetadataDoc, setEditMetadataDoc] = useState<DocumentDetail | null>(
    null,
  );

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadExpiryDate, setUploadExpiryDate] = useState("");
  const [uploadIsConfidential, setUploadIsConfidential] = useState(false);
  const [uploadTagsStr, setUploadTagsStr] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Version Upload State
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [versionUploadProgress, setVersionUploadProgress] = useState<
    number | null
  >(null);
  const [versionUploadError, setVersionUploadError] = useState("");

  // Edit Metadata State
  const [editFileName, setEditFileName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editIsConfidential, setEditIsConfidential] = useState(false);
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editTagsStr, setEditTagsStr] = useState("");
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Fetch Lists
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (searchTerm) qParams.set("query", searchTerm);
      if (selectedCategory) qParams.set("categoryId", selectedCategory);
      if (selectedTag) qParams.set("tag", selectedTag);
      if (selectedExpiry !== "all") qParams.set("expiryStatus", selectedExpiry);

      const res = await fetch(
        `/api/employees/${employeeId}/documents?${qParams.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, searchTerm, selectedCategory, selectedTag, selectedExpiry]);

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [catsRes, tagsRes] = await Promise.all([
        fetch("/api/documents/categories"),
        fetch("/api/documents/tags"),
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (err) {
      console.error("Failed to load auxiliary data:", err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  // File Validation
  const validateFile = (file: File): string | null => {
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      return `File ${file.name} exceeds the 25MB limit.`;
    }
    return null;
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add("border-accent", "bg-accent/5");
    }
  };

  const handleDragLeave = () => {
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove("border-accent", "bg-accent/5");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    setUploadError("");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          return;
        }
        files.push(file);
      }
      setUploadFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          return;
        }
        files.push(file);
      }
      setUploadFiles(files);
    }
  };

  // Document Upload Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (!uploadCategoryId) {
      setUploadError("Please select a category.");
      return;
    }

    setUploadError("");
    setUploadProgress(10); // Simulated start

    try {
      const formData = new FormData();
      formData.append("file", uploadFiles[0]); // Uploading first selected file
      formData.append("categoryId", uploadCategoryId);
      formData.append("description", uploadDescription);
      formData.append("expiryDate", uploadExpiryDate);
      formData.append("isConfidential", uploadIsConfidential ? "true" : "false");
      formData.append("tags", uploadTagsStr);

      setUploadProgress(40);

      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploadModalOpen(false);
          setUploadFiles([]);
          setUploadCategoryId("");
          setUploadDescription("");
          setUploadExpiryDate("");
          setUploadIsConfidential(false);
          setUploadTagsStr("");
          setUploadProgress(null);
          fetchDocuments();
          fetchAuxiliaryData();
        }, 300);
      } else {
        const errorData = await res.json();
        setUploadError(errorData.error || "Upload failed.");
        setUploadProgress(null);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Connection error.");
      setUploadProgress(null);
    }
  };

  // New Version Upload Submit
  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionFile || !versionDrawerDoc) return;

    const error = validateFile(newVersionFile);
    if (error) {
      setVersionUploadError(error);
      return;
    }

    setVersionUploadError("");
    setVersionUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", newVersionFile);

      setVersionUploadProgress(60);

      const res = await fetch(
        `/api/employees/${employeeId}/documents/${versionDrawerDoc.id}/versions`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (res.ok) {
        setVersionUploadProgress(100);
        const updatedDoc = await res.json();
        setVersionDrawerDoc(updatedDoc);
        setNewVersionFile(null);
        setVersionUploadProgress(null);
        fetchDocuments();
      } else {
        const errorData = await res.json();
        setVersionUploadError(errorData.error || "Version upload failed.");
        setVersionUploadProgress(null);
      }
    } catch (err) {
      console.error(err);
      setVersionUploadError("Connection error.");
      setVersionUploadProgress(null);
    }
  };

  // Delete Action Trigger
  const triggerDelete = (doc: DocumentDetail) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Document Record",
      description: `Are you sure you want to permanently delete "${doc.fileName}"? This action is irreversible.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(
            `/api/employees/${employeeId}/documents/${doc.id}`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            fetchDocuments();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // Edit Metadata Trigger
  const triggerEdit = (doc: DocumentDetail) => {
    setEditMetadataDoc(doc);
    setEditFileName(doc.fileName);
    setEditDescription(doc.description || "");
    setEditCategoryId(doc.categoryId);
    setEditIsConfidential(doc.isConfidential);
    setEditExpiryDate(
      doc.expiryDate ? doc.expiryDate.split("T")[0] : "",
    );
    setEditTagsStr(doc.tags.map((t) => t.name).join(", "));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMetadataDoc) return;

    setIsUpdatingMetadata(true);

    try {
      const tagList = editTagsStr
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await fetch(
        `/api/employees/${employeeId}/documents/${editMetadataDoc.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: editFileName,
            description: editDescription,
            categoryId: editCategoryId,
            isConfidential: editIsConfidential,
            expiryDate: editExpiryDate || null,
            tags: tagList,
          }),
        },
      );

      if (res.ok) {
        setEditMetadataDoc(null);
        fetchDocuments();
        fetchAuxiliaryData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  // Helper formatting size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // File Icon Helper
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText size={20} className="text-rose-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <ImageIcon size={20} className="text-purple-500" />;
      case "xls":
      case "xlsx":
      case "csv":
        return <FileSpreadsheet size={20} className="text-emerald-500" />;
      default:
        return <FileIcon size={20} className="text-text-muted" />;
    }
  };

  // Expiry Status Checker
  const getExpiryBadge = (expiryStr: string | null) => {
    if (!expiryStr) return null;
    const now = new Date();
    const expiry = new Date(expiryStr);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiry < now) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Expired
        </span>
      );
    } else if (expiry <= thirtyDaysFromNow) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Expiring Soon
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Valid
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Card */}
      <Card className="border-border bg-background p-4">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
          {/* Text Search */}
          <div className="space-y-1.5 md:col-span-4">
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
              Search Documents
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by file name, tags, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
              />
              <Search
                size={16}
                className="text-text-muted/60 absolute top-2.5 left-3"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
              Category
            </label>
            <CustomSelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={[
                { value: "", label: "All Categories" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              placeholder="All Categories"
            />
          </div>

          {/* Expiry filter */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
              Expiry Status
            </label>
            <CustomSelect
              value={selectedExpiry}
              onChange={setSelectedExpiry}
              options={[
                { value: "all", label: "All Documents" },
                { value: "valid", label: "Valid Only" },
                { value: "expiring_soon", label: "Expiring Soon" },
                { value: "expired", label: "Expired Only" },
              ]}
              placeholder="All Documents"
            />
          </div>

          {/* View mode toggle & Action */}
          <div className="flex items-center gap-2 md:col-span-3">
            <div className="border-border flex rounded-lg border p-1 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded p-1 transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-accent/10 text-accent font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded p-1 transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-accent/10 text-accent font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <List size={16} />
              </button>
            </div>
            <Button
              onClick={() => setUploadModalOpen(true)}
              variant="primary"
              className="flex-1 justify-center py-2 text-xs font-semibold flex items-center gap-1.5 min-w-[90px]"
            >
              <UploadCloud size={14} />
              Upload
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Listing Section */}
      {isLoading ? (
        <div className="flex h-48 w-full flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="text-accent animate-spin" />
          <span className="text-text-muted text-sm font-semibold">
            Loading employee documents...
          </span>
        </div>
      ) : documents.length === 0 ? (
        <div className="border-border/60 flex h-60 w-full flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
          <FileIcon size={40} className="text-text-muted/40 mb-3" />
          <h4 className="text-text-primary text-sm font-bold">
            No Documents Found
          </h4>
          <p className="text-text-muted mt-1 text-xs">
            Start by uploading official records, contracts, or credentials.
          </p>
          <Button
            onClick={() => setUploadModalOpen(true)}
            variant="outline"
            className="mt-4 border-border py-1.5 px-3 hover:bg-surface-hover text-xs font-semibold flex items-center gap-1"
          >
            <Plus size={14} /> Add Document
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {documents.map((doc) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              key={doc.id}
            >
              <Card className="border-border bg-surface hover:border-accent/40 relative flex flex-col justify-between p-4 transition-all hover:shadow-lg">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {getFileIcon(doc.fileName)}
                      <div className="min-w-0">
                        <h4 className="text-text-primary truncate text-sm font-bold">
                          {doc.fileName}
                        </h4>
                        <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">
                          {doc.category.name}
                        </span>
                      </div>
                    </div>
                    {doc.isConfidential && (
                      <span
                        title="Confidential Document"
                        className="bg-rose-500/10 text-rose-500 rounded p-1"
                      >
                        <Lock size={12} />
                      </span>
                    )}
                  </div>

                  <p className="text-text-muted mt-3 line-clamp-2 text-xs">
                    {doc.description || "No description provided."}
                  </p>

                  {/* Expiry and Version Details */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {getExpiryBadge(doc.expiryDate)}
                    <span className="bg-background border-border text-text-muted rounded border px-1.5 py-0.5 text-[10px] font-bold">
                      v{doc.version}
                    </span>
                    <span className="text-text-muted text-[10px] font-semibold">
                      {formatBytes(doc.fileSize)}
                    </span>
                  </div>

                  {/* Tags */}
                  {doc.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {doc.tags.map((t) => (
                        <span
                          key={t.id}
                          className="bg-accent/5 text-accent border border-accent/20 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-3">
                  <div className="text-text-muted text-[10px] font-semibold">
                    Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      title="Preview Document"
                      className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                    <a
                      href={doc.downloadUrl}
                      download={doc.fileName}
                      title="Download"
                      className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => setVersionDrawerDoc(doc)}
                      title="Version History"
                      className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => triggerEdit(doc)}
                      title="Edit Details"
                      className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => triggerDelete(doc)}
                      title="Delete"
                      className="text-text-muted hover:text-rose-500 hover:bg-rose-500/5 rounded p-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List Layout Table */
        <Card className="border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-border border-b bg-background/50 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="p-4">File Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Expiry Status</th>
                  <th className="p-4">Uploaded At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-surface-hover/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        {getFileIcon(doc.fileName)}
                        <div className="min-w-0">
                          <span className="text-text-primary block font-bold truncate">
                            {doc.fileName}
                          </span>
                          <span className="text-text-muted block text-[10px] truncate max-w-[250px]">
                            {doc.description || "No description"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-text-muted">
                      {doc.category.name}
                    </td>
                    <td className="p-4 text-text-muted">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="p-4">
                      <span className="bg-background border-border text-text-muted rounded border px-1.5 py-0.5 font-bold">
                        v{doc.version}
                      </span>
                    </td>
                    <td className="p-4">{getExpiryBadge(doc.expiryDate) || "N/A"}</td>
                    <td className="p-4 text-text-muted">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview"
                          className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                        <a
                          href={doc.downloadUrl}
                          download={doc.fileName}
                          title="Download"
                          className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={() => setVersionDrawerDoc(doc)}
                          title="Versions"
                          className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                        >
                          <History size={13} />
                        </button>
                        <button
                          onClick={() => triggerEdit(doc)}
                          title="Edit"
                          className="text-text-muted hover:text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => triggerDelete(doc)}
                          title="Delete"
                          className="text-text-muted hover:text-rose-500 hover:bg-rose-500/5 rounded p-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* Upload Document Modal                                */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setUploadModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-surface border-border relative w-full max-w-xl rounded-xl border p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                <h3 className="text-text-primary text-base font-bold flex items-center gap-1.5">
                  <UploadCloud className="text-accent" size={18} />
                  Upload Official Document
                </h3>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {uploadError && (
                <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-xs font-semibold mb-4 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border/60 hover:border-accent bg-background/35 hover:bg-accent/5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <UploadCloud size={32} className="text-text-muted mb-2" />
                  {uploadFiles.length > 0 ? (
                    <div>
                      <p className="text-text-primary text-sm font-bold">
                        {uploadFiles[0].name}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        Selected file • {formatBytes(uploadFiles[0].size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-text-primary text-sm font-bold">
                        Drag and drop file here, or click to browse
                      </p>
                      <p className="text-text-muted text-xs mt-1">
                        PDF, DOCX, XLSX, Images, ZIP, CSV, TXT max 25MB
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                      Category *
                    </label>
                    <CustomSelect
                      value={uploadCategoryId}
                      onChange={setUploadCategoryId}
                      options={categories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      placeholder="Select Category"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-1.5">
                    <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={uploadExpiryDate}
                      onChange={(e) => setUploadExpiryDate(e.target.value)}
                      className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter document summary or details..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                    Tags (Comma Separated)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Important, Confidential, Q3 Review"
                      value={uploadTagsStr}
                      onChange={(e) => setUploadTagsStr(e.target.value)}
                      className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
                    />
                    <TagIcon
                      size={14}
                      className="text-text-muted/60 absolute top-3 left-3"
                    />
                  </div>
                </div>

                {/* Confidentiality toggle */}
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="uploadIsConfidential"
                    checked={uploadIsConfidential}
                    onChange={(e) => setUploadIsConfidential(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/50 bg-background accent-accent cursor-pointer"
                  />
                  <label
                    htmlFor="uploadIsConfidential"
                    className="text-text-primary text-xs font-semibold select-none cursor-pointer"
                  >
                    Mark as Confidential (Restricts access to Employees)
                  </label>
                </div>

                {/* Progress bar */}
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-text-muted">
                      <span>Uploading document...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="bg-background border-border h-2 w-full overflow-hidden rounded border">
                      <div
                        className="bg-accent h-full transition-all duration-100"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 hover:bg-surface-hover/80 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-4 py-2 text-xs font-semibold"
                    isLoading={uploadProgress !== null}
                  >
                    Save Upload
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* Edit Metadata Modal                                  */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {editMetadataDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setEditMetadataDoc(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-surface border-border relative w-full max-w-xl rounded-xl border p-6 shadow-2xl z-50"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                <h3 className="text-text-primary text-base font-bold flex items-center gap-1.5">
                  <Edit2 className="text-accent" size={16} />
                  Edit Document Metadata
                </h3>
                <button
                  onClick={() => setEditMetadataDoc(null)}
                  className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* File Name */}
                <div className="space-y-1.5">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                    File Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                    className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                      Category
                    </label>
                    <CustomSelect
                      value={editCategoryId}
                      onChange={setEditCategoryId}
                      options={categories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-1.5">
                    <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                    Tags (Comma Separated)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editTagsStr}
                      onChange={(e) => setEditTagsStr(e.target.value)}
                      className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
                    />
                    <TagIcon
                      size={14}
                      className="text-text-muted/60 absolute top-3 left-3"
                    />
                  </div>
                </div>

                {/* Confidentiality toggle */}
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="editIsConfidential"
                    checked={editIsConfidential}
                    onChange={(e) => setEditIsConfidential(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/50 bg-background accent-accent cursor-pointer"
                  />
                  <label
                    htmlFor="editIsConfidential"
                    className="text-text-primary text-xs font-semibold select-none cursor-pointer"
                  >
                    Mark as Confidential
                  </label>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditMetadataDoc(null)}
                    className="px-4 py-2 hover:bg-surface-hover/80 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-4 py-2 text-xs font-semibold"
                    isLoading={isUpdatingMetadata}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* In-App Document Preview Modal                        */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
              onClick={() => setPreviewDoc(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border-border relative flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border shadow-2xl z-50 overflow-hidden"
            >
              {/* Toolbar */}
              <div className="border-border/40 flex items-center justify-between border-b p-4 bg-background/50">
                <div className="flex items-center gap-2">
                  {getFileIcon(previewDoc.fileName)}
                  <div>
                    <h3 className="text-text-primary text-sm font-bold">
                      {previewDoc.fileName}
                    </h3>
                    <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">
                      {previewDoc.category.name} • Version {previewDoc.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.downloadUrl}
                    download={previewDoc.fileName}
                    className="bg-accent text-white flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent/90 transition-colors"
                  >
                    <Download size={14} /> Download
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="text-text-muted hover:text-text-primary p-2 cursor-pointer rounded hover:bg-surface-hover/80"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* View Panel */}
              <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
                {/* Embed Content Viewer */}
                <div className="flex-1 bg-neutral-900 flex items-center justify-center p-4 relative overflow-y-auto">
                  {previewDoc.fileName.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={`${previewDoc.downloadUrl}#toolbar=0`}
                      className="h-full w-full rounded border-0"
                      title={previewDoc.fileName}
                    />
                  ) : ["png", "jpg", "jpeg", "gif", "webp"].some((ext) =>
                      previewDoc.fileName.toLowerCase().endsWith(ext),
                    ) ? (
                    <img
                      src={previewDoc.downloadUrl}
                      alt={previewDoc.fileName}
                      className="max-h-full max-w-full object-contain rounded shadow-lg"
                    />
                  ) : (
                    <div className="text-center p-8 text-neutral-400">
                      <FileIcon size={48} className="mx-auto mb-3 text-neutral-500" />
                      <p className="text-sm font-semibold">
                        Preview not supported for this file type.
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Please download the file to view it on your device.
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata Side Panel */}
                <div className="border-border/40 w-full md:w-80 border-t md:border-t-0 md:border-l p-5 space-y-4 bg-background/30 overflow-y-auto no-scrollbar">
                  <h4 className="text-text-primary text-xs font-bold uppercase tracking-wider border-b border-border/40 pb-2">
                    Document Metadata
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                        Description
                      </span>
                      <p className="text-text-primary leading-relaxed">
                        {previewDoc.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                        Confidentiality
                      </span>
                      <p className="text-text-primary font-semibold flex items-center gap-1">
                        {previewDoc.isConfidential ? (
                          <>
                            <Lock size={12} className="text-rose-500" />
                            Confidential
                          </>
                        ) : (
                          "Standard"
                        )}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                        Size
                      </span>
                      <p className="text-text-primary font-semibold">
                        {formatBytes(previewDoc.fileSize)}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                        Expiry Date
                      </span>
                      <p className="text-text-primary font-semibold">
                        {previewDoc.expiryDate
                          ? new Date(previewDoc.expiryDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )
                          : "None"}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                        Uploaded By
                      </span>
                      <p className="text-text-primary font-semibold">
                        {previewDoc.uploadedBy || "System"}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                        Created At
                      </span>
                      <p className="text-text-primary font-semibold">
                        {new Date(previewDoc.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {previewDoc.tags.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase block">
                          Tags
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {previewDoc.tags.map((t) => (
                            <span
                              key={t.id}
                              className="bg-accent/10 text-accent border border-accent/20 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* Version History Drawer / Sliding Panel               */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {versionDrawerDoc && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => {
                setVersionDrawerDoc(null);
                setNewVersionFile(null);
                setVersionUploadError("");
              }}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 38 }}
                className="w-screen max-w-md bg-surface border-l border-border/80 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-6 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="text-accent" size={18} />
                    <h3 className="text-text-primary text-base font-bold">
                      Version Management
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setVersionDrawerDoc(null);
                      setNewVersionFile(null);
                      setVersionUploadError("");
                    }}
                    className="text-text-muted hover:text-text-primary p-1 cursor-pointer rounded hover:bg-surface-hover/80"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                  <div>
                    <h4 className="text-text-primary text-xs font-bold uppercase tracking-wider mb-1">
                      Current File
                    </h4>
                    <div className="border-border bg-background/30 flex items-center justify-between rounded-xl border p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(versionDrawerDoc.fileName)}
                        <div className="min-w-0">
                          <span className="text-text-primary block text-xs font-bold truncate">
                            {versionDrawerDoc.fileName}
                          </span>
                          <span className="text-text-muted block text-[10px]">
                            v{versionDrawerDoc.version} •{" "}
                            {formatBytes(versionDrawerDoc.fileSize)}
                          </span>
                        </div>
                      </div>
                      <a
                        href={versionDrawerDoc.downloadUrl}
                        download={versionDrawerDoc.fileName}
                        className="text-accent hover:bg-accent/5 rounded p-1.5 transition-colors cursor-pointer"
                        title="Download current file"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Upload new version form */}
                  <div className="border-border border-t pt-5">
                    <h4 className="text-text-primary text-xs font-bold uppercase tracking-wider mb-2">
                      Upload New Version
                    </h4>
                    {versionUploadError && (
                      <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-2.5 text-[11px] font-semibold mb-3 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        {versionUploadError}
                      </div>
                    )}
                    <form onSubmit={handleVersionSubmit} className="space-y-3">
                      <div className="border-border/60 hover:border-accent bg-background/25 flex flex-col items-center justify-center rounded-lg border border-dashed py-5 px-3 text-center cursor-pointer transition-all">
                        <input
                          type="file"
                          id="newVersionFile"
                          onChange={(e) => {
                            setVersionUploadError("");
                            if (e.target.files && e.target.files.length > 0) {
                              setNewVersionFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="newVersionFile"
                          className="w-full cursor-pointer flex flex-col items-center"
                        >
                          <UploadCloud size={24} className="text-text-muted mb-1" />
                          {newVersionFile ? (
                            <span className="text-text-primary text-xs font-bold truncate max-w-[200px]">
                              {newVersionFile.name}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">
                              Click to select new file version (max 25MB)
                            </span>
                          )}
                        </label>
                      </div>

                      {versionUploadProgress !== null && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-bold text-text-muted">
                            <span>Processing upload...</span>
                            <span>{versionUploadProgress}%</span>
                          </div>
                          <div className="bg-background border-border h-1.5 w-full overflow-hidden rounded border">
                            <div
                              className="bg-accent h-full transition-all duration-100"
                              style={{ width: `${versionUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {newVersionFile && (
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            variant="primary"
                            className="flex-1 justify-center py-2 text-xs font-semibold"
                            isLoading={versionUploadProgress !== null}
                          >
                            Upload Version
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setNewVersionFile(null)}
                            className="py-2 text-xs border-border"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Previous versions list */}
                  <div className="border-border border-t pt-5">
                    <h4 className="text-text-primary text-xs font-bold uppercase tracking-wider mb-3">
                      Previous Versions History
                    </h4>
                    {versionDrawerDoc.versions.length === 0 ? (
                      <p className="text-text-muted text-xs italic">
                        No previous versions recorded.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {versionDrawerDoc.versions.map((ver) => (
                          <div
                            key={ver.id}
                            className="border-border/40 bg-background/15 flex items-center justify-between rounded-lg border p-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="text-text-primary font-semibold truncate">
                                {ver.fileName}
                              </p>
                              <p className="text-text-muted text-[10px] mt-0.5">
                                Version {ver.versionNumber} •{" "}
                                {formatBytes(ver.fileSize)} • By{" "}
                                {ver.uploadedBy || "System"}
                              </p>
                              <span className="text-text-muted text-[9px] block">
                                {new Date(ver.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <a
                              href={ver.downloadUrl}
                              download={ver.fileName}
                              className="text-text-muted hover:text-accent rounded p-1.5 transition-colors cursor-pointer"
                              title="Download this version"
                            >
                              <Download size={13} />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border/40">
                  <Button
                    variant="outline"
                    className="w-full justify-center border-border hover:bg-surface-hover/80"
                    onClick={() => {
                      setVersionDrawerDoc(null);
                      setNewVersionFile(null);
                      setVersionUploadError("");
                    }}
                  >
                    Close Panel
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* Global Confirmation Dialog                           */}
      {/* ---------------------------------------------------- */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        isLoading={confirmDialog.isLoading}
        variant="destructive"
      />
    </div>
  );
}
