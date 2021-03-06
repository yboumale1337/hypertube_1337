export default function validateEditProfile(formData) {
  const {
    first_name,
    last_name,
    username,
    email,
    oldPassword,
    newPassword,
    confirmPassword
  } = formData;
  const errors = {};

  if (first_name === "") errors.first_name = "Enter First Name";
  if (last_name === "") errors.last_name = "Enter Last Name";
  if (username === "") errors.username = "Enter Valid Username";
  if (email === "" || !/\S+@\S+\.\S+/.test(email))
    errors.email = "Enter Valid Email";
  if (oldPassword === "") errors.oldPassword = "Enter Old Password";
  if (!/(?=.*[a-zA-Z])(?=.*[0-9]).{8,30}/i.test(newPassword))
    errors.newPassword = "Enter Valid New Password";
  if (confirmPassword !== newPassword)
    errors.confirmPassword = "Password do not match";
  return errors;
}
