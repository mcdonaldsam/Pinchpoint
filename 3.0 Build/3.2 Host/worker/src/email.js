// Email notifications via Resend — all fire-and-forget (no await needed)

/**
 * Send auto-pause notification when 5 consecutive pings fail.
 */
export function sendAutoPauseNotification(env, email) {
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PinchPoint <notify@pinchpoint.dev>',
      to: email,
      subject: 'PinchPoint: Pings paused — 5 consecutive failures',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 8px;">Your pings have been auto-paused</h2>
          <p style="color: #666; margin: 0 0 16px;">PinchPoint detected 5 consecutive ping failures and paused your schedule to prevent further issues.</p>
          <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Common causes:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #444;">
              <li>Your Claude token may have been revoked or expired</li>
              <li>Anthropic may be experiencing an outage</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 16px;">Visit <a href="https://pinchpoint.dev/dashboard" style="color: #2563eb;">your dashboard</a> to reconnect or unpause.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">— PinchPoint</p>
        </div>
      `,
    }),
  })
}

/**
 * Send disconnect confirmation with token revocation instructions.
 */
export function sendDisconnectNotification(env, email) {
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PinchPoint <notify@pinchpoint.dev>',
      to: email,
      subject: 'PinchPoint: Token disconnected — revoke it to be safe',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 8px;">Your token has been disconnected</h2>
          <p style="color: #666; margin: 0 0 16px;">We've deleted your encrypted Claude token from PinchPoint and stopped all scheduled pings.</p>
          <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Revoke your token for full security:</p>
            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #444;">
              <li>Go to <a href="https://claude.ai/settings" style="color: #2563eb;">claude.ai/settings</a></li>
              <li>Find "Connected apps" or "API keys"</li>
              <li>Revoke the token used with PinchPoint</li>
            </ol>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 16px;">Until revoked, the token remains valid at Anthropic (~1 year lifetime). Disconnecting from PinchPoint deletes our copy, but doesn't invalidate it.</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">— PinchPoint</p>
        </div>
      `,
    }),
  })
}
