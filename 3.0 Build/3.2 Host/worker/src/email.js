// Email notifications via Resend — all fire-and-forget (no await needed)

/**
 * Send success notification with timezone-aware window end time.
 */
export function sendPingNotification(env, email, windowEnds, timezone, exact = false) {
  const endsAt = new Date(windowEnds).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  })
  const tzAbbr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || timezone

  const pingedAt = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  })

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PinchPoint <notify@pinchpoint.dev>',
      to: email,
      subject: `Window active until ${exact ? '' : '~'}${endsAt} ${tzAbbr}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 8px;">Your Claude window is active</h2>
          <p style="color: #666; margin: 0 0 24px;">Pinged at ${pingedAt} ${tzAbbr}</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">${exact ? 'Window ends' : 'Estimated window end'}</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #16a34a;">${exact ? '' : '~'}${endsAt} ${tzAbbr}</p>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">— PinchPoint</p>
        </div>
      `,
    }),
  })
}

/**
 * Send warning when 3+ consecutive ping failures.
 */
export function sendTokenWarningNotification(env, email) {
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PinchPoint <notify@pinchpoint.dev>',
      to: email,
      subject: 'PinchPoint: Ping failures detected',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 8px;">Ping failures detected</h2>
          <p style="color: #666; margin: 0 0 16px;">Your last 3 scheduled pings have failed. Your Claude token may need to be refreshed.</p>
          <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; font-size: 14px;"><strong>To fix:</strong> Run <code>claude setup-token</code> to generate a new token, then reconnect via your dashboard.</p>
          </div>
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

/**
 * Send critical alert when 5+ failures and auto-paused.
 */
export function sendTokenExpiredNotification(env, email) {
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PinchPoint <notify@pinchpoint.dev>',
      to: email,
      subject: 'PinchPoint: Schedule paused — token expired',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 8px;">Your schedule has been paused</h2>
          <p style="color: #666; margin: 0 0 16px;">After 5 consecutive ping failures, we've paused your schedule to avoid wasting resources.</p>
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; font-size: 14px;"><strong>To resume:</strong></p>
            <ol style="margin: 8px 0 0; padding-left: 20px; font-size: 14px;">
              <li>Run <code>claude setup-token</code> for a new token</li>
              <li>Reconnect via your PinchPoint dashboard</li>
              <li>Unpause your schedule</li>
            </ol>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">— PinchPoint</p>
        </div>
      `,
    }),
  })
}
