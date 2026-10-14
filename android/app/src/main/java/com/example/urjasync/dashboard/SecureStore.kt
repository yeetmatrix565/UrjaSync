package com.example.urjasync.dashboard

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** ThingSpeak channel + read key as entered by the user. */
data class Credentials(val channelId: String, val readApiKey: String)

/** Serialised for the WebView bridge; empty string means "not configured". */
fun Credentials?.toBridgeJson(): String {
    if (this == null) return ""
    return JSONObject()
        .put("channelId", channelId)
        .put("readApiKey", readApiKey)
        .toString()
}

/**
 * Credentials at rest: AES/GCM with a key that never leaves the Android Keystore.
 *
 * Deliberately not EncryptedSharedPreferences - androidx.security:security-crypto
 * is deprecated and ships only alpha builds. Every failure path returns null
 * ("not configured") so a hostile Keystore state can never crash startup or lock
 * the user out of the app; they simply re-enter the credentials.
 */
class SecureStore(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun read(): Credentials? {
        val channelId = decrypt(KEY_CHANNEL) ?: return null
        val readApiKey = decrypt(KEY_API_KEY) ?: return null
        return Credentials(channelId, readApiKey)
    }

    fun write(credentials: Credentials) {
        encrypt(KEY_CHANNEL, credentials.channelId)
        encrypt(KEY_API_KEY, credentials.readApiKey)
    }

    fun clear() {
        prefs.edit().remove(KEY_CHANNEL).remove(KEY_API_KEY).apply()
    }

    private fun encrypt(alias: String, value: String) {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val payload = cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        prefs.edit()
            .putString(alias, Base64.encodeToString(payload, Base64.NO_WRAP))
            .apply()
    }

    private fun decrypt(alias: String): String? = try {
        val stored = prefs.getString(alias, null)
        if (stored == null) {
            null
        } else {
            val payload = Base64.decode(stored, Base64.NO_WRAP)
            if (payload.size <= IV_LENGTH) {
                null
            } else {
                val cipher = Cipher.getInstance(TRANSFORMATION)
                cipher.init(
                    Cipher.DECRYPT_MODE,
                    secretKey(),
                    GCMParameterSpec(TAG_BITS, payload, 0, IV_LENGTH),
                )
                String(
                    cipher.doFinal(payload, IV_LENGTH, payload.size - IV_LENGTH),
                    Charsets.UTF_8,
                )
            }
        }
    } catch (_: Exception) {
        null
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val existing = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        if (existing != null) return existing.secretKey

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "urja-sync-credentials"
        const val PREFS_NAME = "urja-sync"
        const val KEY_CHANNEL = "channel_id"
        const val KEY_API_KEY = "read_api_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_LENGTH = 12
        const val TAG_BITS = 128
    }
}
