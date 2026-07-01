import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { getServiceClient } from "@/lib/supabase/service";
import { respondWithError } from "@/lib/api/errors";

const settingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  monthlyReports: z.boolean().optional(),
  dataRetention: z.enum(["3months", "6months", "12months", "24months", "forever"]).optional(),
  twoFactorAuth: z.boolean().optional(),
});

const defaultSettings = {
  emailNotifications: true,
  pushNotifications: false,
  weeklyReports: true,
  monthlyReports: true,
  dataRetention: "12months" as const,
  twoFactorAuth: false,
};

export async function GET() {
  try {
    const { session } = await getRouteContext();
    const meta = session.user.user_metadata as Record<string, unknown> | null;
    const stored = (meta?.preferences ?? {}) as Record<string, unknown>;
    const preferences = { ...defaultSettings, ...stored };
    return NextResponse.json(preferences);
  } catch (error) {
    return respondWithError(error, { action: "get-settings" });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = settingsSchema.parse(body);
    const { session } = await getRouteContext();

    const service = getServiceClient();
    const currentMeta = (session.user.user_metadata as Record<string, unknown>) ?? {};
    const currentPrefs = (currentMeta.preferences as Record<string, unknown>) ?? {};
    const newPrefs = { ...currentPrefs, ...updates };

    const { error } = await service.auth.admin.updateUserById(session.user.id, {
      user_metadata: { ...currentMeta, preferences: newPrefs },
    });

    if (error) throw error;
    return NextResponse.json({ ...defaultSettings, ...newPrefs });
  } catch (error) {
    return respondWithError(error, { action: "update-settings" });
  }
}
