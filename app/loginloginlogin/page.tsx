"use client";
import React, { useState, useEffect } from "react";
import {
  Twitter,
  User,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Loader,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import { DeleteTweetSection } from "../deletetweet";
import { EmailInviteSender } from "../email-invite-sender";
import { TweetComposer } from "../components/tweet-composer";
import { ThreadComposer } from "../components/thread-composer";

interface User {
  id: string;
  name: string;
  email: string;
  twitterUsername?: string;
  twitterUserId?: string;
  twitterAccessToken?: string;
  twitterTokenExpiry?: string;
  hasValidToken: boolean;
  tokenExpired: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TwitterOAuthDemo() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize] = useState(10);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/user/current");
      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.twitterAccessToken) {
          setCurrentUser(userData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  };

  const fetchAllUsers = async (page = 1) => {
    setUsersLoading(true);
    try {
      const response = await fetch(
        `/api/user/all?page=${page}&pageSize=${usersPageSize}&status=active`,
      );
      if (response.ok) {
        const payload = await response.json();
        const data = Array.isArray(payload.data) ? payload.data : [];
        const filtered = data.filter((user) => !user.tokenExpired);
        setAllUsers(filtered);

        const nextPage = Number(payload.page ?? page);
        setUsersPage(Number.isFinite(nextPage) && nextPage > 0 ? nextPage : page);

        const nextTotalPages = Number(payload.totalPages ?? 1);
        setUsersTotalPages(
          Number.isFinite(nextTotalPages) && nextTotalPages > 0
            ? nextTotalPages
            : 1,
        );

        const nextTotal = Number(payload.total ?? filtered.length);
        setUsersTotal(
          Number.isFinite(nextTotal) && nextTotal >= 0 ? nextTotal : filtered.length,
        );
      }
    } catch (err) {
      console.error("Failed to fetch all users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const connectAsUser = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/user/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to connect as user");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const initiateTwitterAuth = () => {
    setLoading(true);
    setError("");
    window.location.href = "/api/auth/twitter";
  };

  const testApiCall = async (
    endpoint: string,
    description: string,
    method = "GET",
    body: any = null,
  ) => {
    try {
      const options: any = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body) {
        const bodyWithUserId = { ...body, userId: currentUser?.id };
        options.body = JSON.stringify(bodyWithUserId);
      } else if (currentUser?.id) {
        // For GET requests, add userId as query parameter
        const url = `/api/twitter/${endpoint}?userId=${currentUser.id}`;
        const response = await fetch(url, options);
        const data = await response.json();

        const result = {
          id: Date.now(),
          description,
          success: response.ok,
          data: response.ok ? data : null,
          error: response.ok ? null : data.error || "Unknown error",
          timestamp: new Date().toLocaleTimeString(),
        };

        setTestResults((prev) => [result, ...prev]);
        return result;
      }

      const response = await fetch(`/api/twitter/${endpoint}`, options);
      const data = await response.json();

      const result = {
        id: Date.now(),
        description,
        success: response.ok,
        data: response.ok ? data : null,
        error: response.ok ? null : data.error || "Unknown error",
        timestamp: new Date().toLocaleTimeString(),
      };

      setTestResults((prev) => [result, ...prev]);
      return result;
    } catch (err: any) {
      const result = {
        id: Date.now(),
        description,
        success: false,
        error: err.message,
        timestamp: new Date().toLocaleTimeString(),
      };
      setTestResults((prev) => [result, ...prev]);
      return result;
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);

    await testApiCall("me", "Get authenticated user info");
    await testApiCall("profile", "Get user profile details");
    await testApiCall("followers", "Get followers count");
    await testApiCall("timeline", "Get user timeline");

    setLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserStatusColor = (user: User) => {
    if (!user.twitterAccessToken) return "text-gray-500";
    if (user.tokenExpired) return "text-orange-500";
    return "text-green-500";
  };

  const getUserStatusText = (user: User) => {
    if (!user.twitterAccessToken) return "No Twitter Access";
    if (user.tokenExpired) return "Token Expired";
    return "Connected";
  };

  const displayedUsers = allUsers;

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > usersTotalPages || usersLoading) {
      return;
    }
    fetchAllUsers(targetPage);
  };

  const handleDeleteSectionUserSelect = (user: any) => {
    setCurrentUser({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email,
      twitterUsername: user.twitterUsername || undefined,
      twitterUserId: user.twitterUserId || undefined,
      twitterAccessToken: user.twitterAccessToken || undefined,
      twitterTokenExpiry: user.twitterTokenExpiry || undefined,
      hasValidToken: Boolean(user.hasValidToken),
      tokenExpired: Boolean(user.tokenExpired),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    });
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchAllUsers(1);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth") === "success") {
      fetchCurrentUser();
      fetchAllUsers(1);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <Image
              width={30}
              alt="mele"
              height={30}
              src="/mele.png"
              className="w-8 h-8 text-white"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Twitter OAuth Integration
          </h1>
          <p className="text-gray-600">
            Manage Twitter accounts and test API functionality
          </p>
        </div>

        {/* Users List Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Available Users
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchAllUsers(usersPage)}
                disabled={usersLoading}
                className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {usersLoading ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <User className="w-4 h-4 mr-2" />
                )}
                Refresh
              </button>
              <button
                onClick={initiateTwitterAuth}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New User
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No users found yet. Connect your first Twitter account!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Twitter
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      connected at
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        currentUser?.id === user.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-semibold text-sm">
                              {user.name?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {user.twitterUsername ? (
                          <div className="flex items-center">
                            <Twitter className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="text-gray-900">
                              @{user.twitterUsername}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Not connected</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUserStatusColor(
                            user,
                          )}`}
                        >
                          {getUserStatusText(user)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {currentUser?.id === user.id ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => connectAsUser(user.id)}
                            disabled={loading || !user.hasValidToken}
                            className="inline-flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? (
                              <Loader className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4 mr-1" />
                            )}
                            Connect
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing page {usersPage} of {usersTotalPages} ({usersTotal} users)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(usersPage - 1)}
                    disabled={usersPage <= 1 || usersLoading}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => goToPage(usersPage + 1)}
                    disabled={usersPage >= usersTotalPages || usersLoading}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {currentUser ? (
          /* Dashboard Section */
          <div className="space-y-6">
            {/* Current User Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {currentUser.name?.charAt(0) || "U"}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentUser.name}
                  </h3>
                  <p className="text-gray-600">
                    @{currentUser.twitterUsername}
                  </p>
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Currently Active</span>
                </div>
              </div>
            </div>

            {/* <TweetComposer currentUser={currentUser} /> */}

            <ThreadComposer
              currentUser={currentUser}
              onThreadSuccess={() => {
                console.log("Thread posted!");
              }}
            />

            <DeleteTweetSection
              currentUser={currentUser}
              onSelectUser={handleDeleteSectionUserSelect}
            />

            {/* API Testing Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  API Testing
                </h3>
                <div className="space-x-3">
                  <button
                    onClick={runAllTests}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Run All Tests
                  </button>
                  {testResults.length > 0 && (
                    <button
                      onClick={clearResults}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Test Results */}
              {testResults.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testResults.map((result) => (
                    <div
                      key={result.id}
                      className={`p-4 rounded-lg border ${
                        result.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {result.description}
                            </p>
                            {result.error && (
                              <p className="text-red-600 text-sm mt-1">
                                {result.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {result.timestamp}
                        </span>
                      </div>

                      {result.data && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          <pre className="whitespace-pre-wrap text-gray-700">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {testResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>
                    No test results yet. Run some tests to see the results here.
                  </p>
                </div>
              )}
            </div>

            {/* Email Invite Sender */}
            <EmailInviteSender />

            {/* Disconnect Option */}
            <div className="text-center space-y-2">
              <button
                onClick={fetchCurrentUser}
                className="text-blue-600 hover:text-blue-700 text-sm underline mr-4"
              >
                Refresh User Data
              </button>
              <button
                onClick={() => setCurrentUser(null)}
                className="text-red-600 hover:text-red-700 text-sm underline"
              >
                Clear Active User (for testing)
              </button>
            </div>
          </div>
        ) : (
          /* No Active User Section */
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                No Active User
              </h2>
              <p className="text-gray-600 mb-6">
                Select a user from the list above or connect a new Twitter
                account
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            <button
              onClick={initiateTwitterAuth}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Twitter className="w-5 h-5 mr-2" />
              )}
              {loading ? "Connecting..." : "Connect New Twitter Account"}
            </button>

            <div className="mt-8">
              <EmailInviteSender />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
