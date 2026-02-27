// app/dashboard/profile/page.client.tsx
"use client";

import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { User, Mail, Phone, MapPin, Calendar } from "lucide-react";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
    joinDate: "January 15, 2024",
    bio: "High school teacher with 5 years of experience",
    avatar: "JD",
  });

  return (
    <div className="w-full">
      <TopBar title="Profile" subtitle="Profile" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-2xl font-bold text-white mb-4">
                  {profile.avatar}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">{profile.name}</h2>
                <p className="text-sm text-slate-600 mb-6">{profile.email}</p>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  {/* Edit Form */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => setIsEditing(false)} className="flex-1">
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Full Name
                      </p>
                      <p className="text-slate-900 font-medium">{profile.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Email
                      </p>
                      <p className="text-slate-900 font-medium">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Phone
                      </p>
                      <p className="text-slate-900 font-medium">{profile.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Location
                      </p>
                      <p className="text-slate-900 font-medium">{profile.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Member Since
                      </p>
                      <p className="text-slate-900 font-medium">{profile.joinDate}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                      Bio
                    </p>
                    <p className="text-slate-900">{profile.bio}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
