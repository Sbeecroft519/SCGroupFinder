"""One-time local configuration: preserves existing VAPID keys on subsequent runs."""
import base64
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from dotenv import dotenv_values, set_key

env_file = Path(__file__).parent / '.env'
env = dotenv_values(env_file)
if not env.get('VAPID_PRIVATE_KEY'):
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    set_key(env_file, 'VAPID_PRIVATE_KEY', base64.urlsafe_b64encode(private).decode().rstrip('='))
    set_key(env_file, 'VAPID_PUBLIC_KEY', base64.urlsafe_b64encode(public).decode().rstrip('='))
if not env.get('VAPID_SUBJECT'):
    set_key(env_file, 'VAPID_SUBJECT', dotenv_values(env_file.parent.parent / 'frontend/.env')['REACT_APP_BACKEND_URL'])
if not env.get('PUSH_ENDPOINT_SUFFIXES'):
    set_key(env_file, 'PUSH_ENDPOINT_SUFFIXES', 'fcm.googleapis.com,updates.push.services.mozilla.com,push.services.mozilla.com,push.apple.com,notify.windows.com')
print('Web Push configuration ready; private key not displayed.')