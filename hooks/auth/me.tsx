'use client'

import { authClient } from "@/lib/auth-client";
import { useStoreClient } from "@/store/client";
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect, useState } from "react";

interface MeData {
    fingerprint: string | null;
    userId: string | null;
}

export function useGetMeAggressively() {
    const store = useStoreClient();
    const [meData, setMeData] = useState<MeData>({
        fingerprint: null,
        userId: null
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // First check if we have stored data
                if (store.me) {
                    setMeData({
                        fingerprint: store.me.fingerprint,
                        userId: store.me.userId,
                    });
                    return;
                }

                // Get the user browser fingerprint
                const fingerprint = await getFingerprint();

                // Try sign in first
                const signInResponse = await authClient.signIn.email({
                    email: `${fingerprint}@wasm.channel.com`,
                    password: fingerprint,
                });

                if (signInResponse.data?.user) {
                    const newMeData = {
                        fingerprint,
                        userId: signInResponse.data.user.id,
                    };
                    store.setMe(newMeData);
                    setMeData(newMeData);
                    return;
                }

                // If sign in fails, try sign up
                const signUpResponse = await authClient.signUp.email({
                    email: `${fingerprint}@wasm.channel.com`,
                    password: fingerprint,
                    name: fingerprint,
                });

                if (signUpResponse.data?.user) {
                    const newMeData = {
                        fingerprint,
                        userId: signUpResponse.data.user.id,
                    };
                    store.setMe(newMeData);
                    setMeData(newMeData);
                    return;
                }

                // If all attempts fail
                setMeData({
                    fingerprint: null,
                    userId: null,
                });
            } catch (err) {
                setError(err instanceof Error ? err : new Error('An unknown error occurred'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchMe();
    }, [store]); // Only re-run if store changes

    return {
        ...meData,
        isLoading,
        error,
    };
}