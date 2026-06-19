import { Button } from "./button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "./alert-dialog";

export function ConfirmationDialogue({
    open,
    onOpenChange,
    title = "Confirm action",
    description = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    loading = false,
    confirmVariant = "default",
    className,
    children,
}) {
    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className={className}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                {children && (
                  <div className="mt-4">
                    {children}
                  </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <Button
                        variant={confirmVariant}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? `${confirmLabel}...` : confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}