import * as yup from "yup";

import type { UserFormValues } from "../../types/userManagement";
import {
  validateEmailField,
  validatePersonNameField,
  validatePhoneNumberField,
} from "../../utils/formValidation";

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
      .test("name-valid", "Enter a valid full name (first and last name).", function (value) {
        if (!value) {
          return true;
        }
        const message = validatePersonNameField(value, {
          fieldLabel: "Full name",
          requireFullName: true,
        });
        if (!message) {
          return true;
        }
        return this.createError({ message });
      }),
    email: yup
      .string()
      .trim()
      .required("Email address is required.")
      .test("email-format", "Enter a valid email address (name@company.com).", function (value) {
        if (!value) {
          return true;
        }
        const message = validateEmailField(value);
        if (!message) {
          return true;
        }
        return this.createError({ message });
      }),
    phone_number: yup
      .string()
      .trim()
      .required("Phone number is required.")
      .test("phone-valid", "Phone number must contain exactly 10 digits.", function (value) {
        if (!value) {
          return true;
        }
        const message = validatePhoneNumberField(value);
        if (!message) {
          return true;
        }
        return this.createError({ message });
      }),
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
