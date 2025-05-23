import { z } from "zod";
import * as arctic from "arctic";

const getCallbackUrl = (provider: string) => {
  return process.env.APPLICATION_URL
    ? `https://${process.env.APPLICATION_URL}/api/auth/${provider}/callback`
    : `http://localhost:3000/api/auth/${provider}/callback`;
};

const linkedin = new arctic.LinkedIn(
  process.env.OAUTH_LINKEDIN_CLIENT_ID!,
  process.env.OAUTH_LINKEDIN_CLIENT_SECRET!,
  getCallbackUrl("linkedin")
);

const LinkedinUserSchema = z.object({
  sub: z.string(),
  name: z.string(),
  given_name: z.string(),
  family_name: z.string(),
  email: z.string().email(),
  email_verified: z.enum(["true", "false"]).transform((val) => val === "true"),
  locale: z.string(),
  picture: z.string().nullable(),
});

const LinkedinProfileSchema = z.object({
  vanityName: z.string(),
  localizedHeadline: z.string(),
});

type LinkedinProfile = z.infer<typeof LinkedinProfileSchema>;

async function getLinkedinProfile(
  accessToken: string
): Promise<LinkedinProfile> {
  const response = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.status}`);
  }

  const data = await response.json();

  return LinkedinProfileSchema.parse(data);
}

const google = new arctic.Google(
  process.env.OAUTH_GOOGLE_CLIENT_ID!,
  process.env.OAUTH_GOOGLE_CLIENT_SECRET!,
  getCallbackUrl("google")
);

const GoogleUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  verified_email: z.boolean(),
  name: z.string(),
  given_name: z.string(),
  family_name: z.string(),
  picture: z.string().url(),
});

type GoogleUser = z.infer<typeof GoogleUserSchema>;

async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    return GoogleUserSchema.parse(data);
  } catch (err) {
    throw new Error(`Invalid Google user: ${err}`);
  }
}

export {
  LinkedinUserSchema,
  getLinkedinProfile,
  getGoogleUser,
  linkedin,
  google,
};
