import { Request, Response, NextFunction } from "express";
import { verifyToken, supabaseAdmin } from "../services/supabase";
import { UserRole } from "../types";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.replace("Bearer ", "");
    const authUser = await verifyToken(token);

    if (!authUser) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    req.user = {
      id: authUser.id,
      email: authUser.email ?? "",
      role: (profile?.role as UserRole) ?? "student",
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication error" });
  }
}

export function requireRole(role: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({
        error: `Access denied. Required role: ${role}`,
      });
    }
    next();
  };
}
