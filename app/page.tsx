import { redirect } from "next/navigation";

// İlk girişte kullanıcıyı finans ve planlama alanına yönlendir.
export default function Home() {
  redirect("/panel");
}
