"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, type UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const validRoles: UserRole[] = ["funcionario", "admin"];

async function employeeExists(code:string){if(!code)return true;const supabase=await createClient();const {data}=await supabase.from("employees").select("id").eq("code",code).maybeSingle();return Boolean(data)}

export async function createAccount(formData:FormData){
  await requireRole(["admin"]);const email=String(formData.get("email")??"").trim().toLowerCase(),password=String(formData.get("password")??""),displayName=String(formData.get("display_name")??"").trim(),role=String(formData.get("role")??"") as UserRole,employeeId=String(formData.get("employee_id")??"").trim().toUpperCase();
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8||displayName.length>80||!validRoles.includes(role)||!(await employeeExists(employeeId)))redirect("/adm?erro=dados#nova-conta");
  const admin=createAdminClient();if(!admin)redirect("/adm?erro=config#nova-conta");
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:displayName}});if(error||!data.user)redirect("/adm?erro=conta#nova-conta");
  const {error:profileError}=await admin.from("profiles").upsert({id:data.user.id,email,display_name:displayName||null,role,employee_id:employeeId||null,updated_at:new Date().toISOString()});
  if(profileError){await admin.auth.admin.deleteUser(data.user.id);redirect("/adm?erro=salvar#nova-conta")}
  revalidatePath("/adm");redirect("/adm?criado=1#usuarios");
}

export async function updateProfile(formData: FormData) {
  const currentProfile = await requireRole(["admin"]);
  const id = formData.get("id");
  const displayName = formData.get("display_name");
  const role = formData.get("role");
  const employeeId = formData.get("employee_id");
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(id) ||
    typeof displayName !== "string" ||
    displayName.trim().length > 80 ||
    typeof role !== "string" ||
    !validRoles.includes(role as UserRole) ||
    typeof employeeId !== "string" ||
    employeeId.trim().length > 80 ||
    typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim()) ||
    typeof password !== "string" || (password.length > 0 && password.length < 8)
  ) {
    redirect("/adm?erro=dados#usuarios");
  }

  if (id === currentProfile.id && role !== "admin") {
    redirect("/adm?erro=proprio#usuarios");
  }
  if (!(await employeeExists(employeeId.trim().toUpperCase()))) redirect("/adm?erro=dados#usuarios");

  const admin=createAdminClient();if(!admin)redirect("/adm?erro=config#usuarios");
  const { data: founderAdmin } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (id === founderAdmin?.id && role !== "admin") {
    redirect("/adm?erro=fundador#usuarios");
  }

  const {error:authError}=await admin.auth.admin.updateUserById(id,{email:email.trim().toLowerCase(),...(password?{password}:{})});
  if(authError)redirect("/adm?erro=conta#usuarios");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName.trim() || null,
      role,
      email: email.trim().toLowerCase(),
      employee_id: employeeId.trim().toUpperCase() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect("/adm?erro=salvar#usuarios");
  }

  revalidatePath("/adm");
  revalidatePath("/");
  revalidatePath("/relatorios");
  redirect("/adm?salvo=1#usuarios");
}
