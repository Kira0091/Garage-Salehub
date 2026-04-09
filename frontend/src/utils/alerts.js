import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#e11d48",
  background: "#ffffff",
};

export const alertSuccess = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    icon: "success",
    title,
    text,
  });

export const alertError = (text, title = "Action failed") =>
  Swal.fire({
    ...baseOptions,
    icon: "error",
    title,
    text,
  });

export const alertInfo = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    icon: "info",
    title,
    text,
  });

export const confirmAction = async ({
  title,
  text = "",
  icon = "warning",
  confirmText = "Yes, continue",
  cancelText = "Cancel",
  confirmButtonColor = "#dc2626",
}) => {
  const result = await Swal.fire({
    ...baseOptions,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor,
    reverseButtons: true,
  });
  return result.isConfirmed;
};
