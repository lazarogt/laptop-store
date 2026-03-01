import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, PackageSearch } from "lucide-react";

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onLoginSubmit = (data: LoginForm) => login(data);
  const onRegisterSubmit = (data: RegisterForm) => register(data);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 text-3xl font-display font-bold text-primary mb-8 hover:text-accent transition-colors">
        <PackageSearch className="w-8 h-8 text-accent" />
        <span>Laptop<span className="text-accent">Store</span></span>
      </Link>

      <div className="bg-card w-full max-w-md border rounded-2xl shadow-xl overflow-hidden">
        <div className="flex border-b">
          <button 
            className={`flex-1 py-4 font-bold text-sm ${isLogin ? 'text-primary border-b-2 border-accent bg-white' : 'text-muted-foreground bg-gray-50 hover:bg-gray-100'}`}
            onClick={() => setIsLogin(true)}
          >
            Iniciar sesión
          </button>
          <button 
            className={`flex-1 py-4 font-bold text-sm ${!isLogin ? 'text-primary border-b-2 border-accent bg-white' : 'text-muted-foreground bg-gray-50 hover:bg-gray-100'}`}
            onClick={() => setIsLogin(false)}
          >
            Crear cuenta
          </button>
        </div>

        <div className="p-8">
          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Usa tu correo real y tu número de teléfono real al finalizar la compra; enviaremos confirmaciones del pedido por correo y Telegram.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correo electrónico</label>
                <Input type="email" {...loginForm.register("email")} />
                {loginForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <Input type="password" {...loginForm.register("password")} />
                {loginForm.formState.errors.password && <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" disabled={isLoggingIn} className="w-full bg-accent hover:bg-accent/90 text-primary font-bold mt-6">
                {isLoggingIn ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Registra un correo real. También usa un número real al finalizar la compra para recibir confirmaciones del pedido por correo y Telegram.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre completo</label>
                <Input {...registerForm.register("name")} />
                {registerForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correo electrónico</label>
                <Input type="email" {...registerForm.register("email")} />
                {registerForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <Input type="password" {...registerForm.register("password")} />
                {registerForm.formState.errors.password && <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" disabled={isRegistering} className="w-full bg-accent hover:bg-accent/90 text-primary font-bold mt-6">
                {isRegistering ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
