import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface DropAndUploadProps {
    id?: string;
    label?: string;
    buttonText?: string;
    helper?: string;
    accept?: string;
    height?: number;
    maxFileSize?: number; // In bytes
    onFile?: (file: File, options: { setStatus: (message: string, isError?: boolean) => void }) => void;
}

export const DropAndUpload = React.forwardRef<HTMLDivElement, DropAndUploadProps>(
    (
        {
            id,
            label,
            buttonText = "Drop file here or click to upload",
            helper,
            accept = ".json,application/json",
            height = 50,
            maxFileSize = 10 * 1024 * 1024, // 10MB
            onFile,
        },
        ref
    ) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const dropZoneRef = useRef<HTMLButtonElement>(null);
        const [status, setStatusMessage] = useState("");
        const [isError, setIsError] = useState(false);
        const [isDragActive, setIsDragActive] = useState(false);

        const setStatus = (message: string, error = false) => {
            setStatusMessage(message);
            setIsError(error);
        };

        const validateAndHandleFile = (file: File) => {
            // Check file size if limit is set
            if (maxFileSize && file.size > maxFileSize) {
                const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                setStatus(
                    `File too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB.`,
                    true
                );
                return;
            }

            const allowedExtensions = accept.split(",").map(ext =>
                ext.trim().replace(/^\./, "")
            );
            const fileExtension = file.name.split(".").pop()?.toLowerCase();

            if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
                setStatus(
                    `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`,
                    true
                );
                return;
            }

            // Clear any previous error messages
            setStatus("");

            // Call parent's onFile handler
            if (onFile) {
                onFile(file, { setStatus });
            }
        };

        const handleFiles = (files: FileList | null) => {
            if (!files || !files.length) return;
            const file = files[0];
            validateAndHandleFile(file);
        };

        const handleClick = () => {
            inputRef.current?.click();
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            handleFiles(e.target.files);
        };

        const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setIsDragActive(true);
        };

        const handleDragLeave = () => {
            setIsDragActive(false);
        };

        const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setIsDragActive(false);
            handleFiles(e.dataTransfer?.files);
        };

        return (
            <div ref={ref} className="space-y-2">
                {label && <p className="text-sm text-muted-foreground">{label}</p>}

                <Button
                    ref={dropZoneRef}
                    type="button"
                    id={id}
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isDragActive
                            ? "bg-muted/50 border-2 border-muted-foreground text-foreground"
                            : "border-gray-400"
                    }`}
                    style={{ height: `${height}px` }}
                >
                    {buttonText}
                </Button>

                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    className="sr-only"
                    tabIndex={-1}
                />

                {helper && <p className="text-xs text-muted-foreground">{helper}</p>}

                {status && (
                    <p
                        className={`text-xs ${
                            isError ? "text-destructive" : "text-muted-foreground"
                        }`}
                    >
                        {status}
                    </p>
                )}
            </div>
        );
    }
);

DropAndUpload.displayName = "DropAndUpload";