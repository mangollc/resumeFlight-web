import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const jobProverbs = [
  "Your perfect job is waiting for you to be ready for it.",
  "Every expert was once a beginner.",
  "Success is built one opportunity at a time.",
  "Your career is a journey, not a destination.",
  "The best way to predict your future is to create it.",
  "Small progress is still progress.",
  "Behind every successful career is a lot of hard work.",
  "Your potential is unlimited. Your opportunities are endless.",
];

// Create a base login schema instead of using pick on insertUserSchema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [proverb, setProverb] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * jobProverbs.length);
    setProverb(jobProverbs[randomIndex]);
  }, []);

  // Handle successful authentication
  useEffect(() => {
    if (user) {
      // Show welcome message only on successful login/register
      if (loginMutation.isSuccess || registerMutation.isSuccess) {
        toast({
          title: "Welcome to ResumeFlight! 👋",
          description: `Good to see you, ${user.name}! Let's optimize your resume.`,
          duration: 5000,
        });
      }
      setLocation("/dashboard");
    }
  }, [user, loginMutation.isSuccess, registerMutation.isSuccess, toast, setLocation]);

  // Return early if user is logged in to prevent rendering the login page
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Welcome to ResumeFlight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm onSubmit={(data: LoginData) => loginMutation.mutate(data)} />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm onSubmit={(data: InsertUser) => registerMutation.mutate(data)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-8 lg:p-12 lg:pl-24">
        <div className="max-w-xl text-white">
          <div className="text-center mb-8 lg:mb-12">
            <p className="text-lg lg:text-xl italic font-light mb-4">
              "{proverb}"
            </p>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4 lg:mb-6 text-center">
            Optimize Your Resume with AI
          </h1>
          <p className="text-base lg:text-lg mb-6 lg:mb-8 text-center">
            Upload your resume and let our AI technology optimize it for your dream job. Get better matches and more interviews with ResumeFlight.
          </p>
          <ul className="space-y-4 max-w-md mx-auto">
            <li className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Smart AI-powered optimization
            </li>
            <li className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Tailored to specific job descriptions
            </li>
            <li className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Professional formatting
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface LoginFormProps {
  onSubmit: (data: LoginData) => void;
}

function LoginForm({ onSubmit }: LoginFormProps) {
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </Form>
  );
}

interface RegisterFormProps {
  onSubmit: (data: InsertUser) => void;
}

function RegisterForm({ onSubmit }: RegisterFormProps) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Register
        </Button>
      </form>
    </Form>
  );
}