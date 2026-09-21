import { redirect } from "next/navigation";

export default function Authenticate() {
  redirect("/authenticate/sign-in");
}