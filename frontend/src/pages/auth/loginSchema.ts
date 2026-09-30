import * as yup from "yup";

import { validateEmailField } from "../../utils/formValidation";

export const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required("Email address is required.")
    .test("email-format", "Enter a valid email address.", function (value) {
      if (!value) {
        return true;
      }
      const message = validateEmailField(value);
      if (!message) {
        return true;
      }
      return this.createError({ message });
    }),
  password: yup.string().required("Password is required."),
  rememberMe: yup.boolean().default(false),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;
