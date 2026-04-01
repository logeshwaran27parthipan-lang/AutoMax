"use client";
import React from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await axios.post("/api/auth/register", data);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md p-6 bg-white rounded shadow"
      >
        <h1 className="text-2xl font-semibold mb-4">Create account</h1>
        <label className="block mb-2">Name</label>
        <input
          {...register("name")}
          className="w-full p-2 border rounded mb-3"
        />
        <label className="block mb-2">Email</label>
        <input
          {...register("email")}
          className="w-full p-2 border rounded mb-3"
        />
        <label className="block mb-2">Password</label>
        <input
          type="password"
          {...register("password")}
          className="w-full p-2 border rounded mb-3"
        />
        <button
          type="submit"
          className="w-full py-2 bg-green-600 text-white rounded"
        >
          Create account
        </button>
      </form>
    </div>
  );
}
