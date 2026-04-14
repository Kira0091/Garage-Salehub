import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#e11d48",
  background: "#ffffff",
};

const toastOptions = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timerProgressBar: true,
};

export const alertSuccess = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    ...toastOptions,
    icon: "success",
    title,
    text,
    timer: 2200,
  });

export const alertError = (text, title = "Action failed") =>
  Swal.fire({
    ...baseOptions,
    ...toastOptions,
    icon: "error",
    title,
    text,
    timer: 3000,
  });

export const alertInfo = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    ...toastOptions,
    icon: "info",
    title,
    text,
    timer: 2400,
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
