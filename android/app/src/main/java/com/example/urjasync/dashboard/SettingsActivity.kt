package com.example.urjasync.dashboard

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast

/**
 * Where the user connects their own ThingSpeak channel. Credentials are written
 * straight into [SecureStore]; the dashboard reads them over the JS bridge.
 */
class SettingsActivity : Activity() {

    private lateinit var store: SecureStore
    private lateinit var channelId: EditText
    private lateinit var readApiKey: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        store = SecureStore(this)
        channelId = findViewById(R.id.channel_id)
        readApiKey = findViewById(R.id.read_api_key)

        store.read()?.let { saved ->
            channelId.setText(saved.channelId)
            readApiKey.setText(saved.readApiKey)
        }

        findViewById<Button>(R.id.save).setOnClickListener { save() }
        findViewById<Button>(R.id.clear).setOnClickListener { clear() }
        findViewById<TextView>(R.id.help_link).setOnClickListener {
            startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("https://thingspeak.com/channels")),
            )
        }
    }

    private fun save() {
        val channel = channelId.text.toString().trim()
        val key = readApiKey.text.toString().trim()

        if (channel.isEmpty() || key.isEmpty()) {
            toast(getString(R.string.settings_missing_fields))
            return
        }

        store.write(Credentials(channel, key))
        toast(getString(R.string.settings_saved))
        finish()
    }

    private fun clear() {
        store.clear()
        channelId.setText("")
        readApiKey.setText("")
        toast(getString(R.string.settings_cleared))
    }

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
