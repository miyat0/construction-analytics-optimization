import * as yup from "yup";

import type { UserFormValues } from "../../types/userManagement";

const passwordSchema = yup
  .string()
  .min(8, "Password must be at least 8 characters.")
  .matches(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .matches(/[a-z]/, "Password must contain at least one lowercase letter.")
  .matches(/[0-9]/, "Password must contain at least one digit.")
  .matches(/[^A-Za-z0-9]/, "Password must contain at least one special character.");

export const getDefaultUserFormValues = (): UserFormValues => ({
  name: "",
  email: "",
  phone_number: "",
  role_id: undefined,
  password: "",
});

export const getUserFormSchema = (mode: "create" | "edit") => {
  return yup.object({
    name: yup
      .string()
      .trim()
      .required("Full name is required.")
      .max(150, "Full name cannot exceed 150 characters."),
    email: yup
      .string()
      .trim()
      .required("Email address is required.")
      .email("Enter a valid email address."),
    phone_number: yup
      .string()
      .trim()
      .required("Phone number is required.")
      .matches(/^\d{10}$/, "Phone number must contain exactly 10 digits."),
    role_id: yup
      .number()
      .typeError("Role is required.")
      .required("Role is required."),
    password:
      mode === "create"
        ? passwordSchema.required("Password is required.")
        : passwordSchema
            .transform((value) => (value === "" ? undefined : value))
            .notRequired(),
  });
};
