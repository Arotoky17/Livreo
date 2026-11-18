import { profilePhotos } from '../services/profilePhoto.service.js';

export async function getMyPhoto(req, res, next) {
  try { res.set('Cache-Control', 'no-store').json({ success: true, avatarUrl: await profilePhotos.get(req.user.id) }); }
  catch (error) { next(error); }
}
export async function updateMyPhoto(req, res, next) {
  try {
    const avatarUrl = await profilePhotos.save(req.user.id, req.body?.image);
    res.set('Cache-Control', 'no-store').json({ success: true, message: 'Photo de profil enregistrée.', avatarUrl });
  } catch (error) { next(error); }
}
export async function deleteMyPhoto(req, res, next) {
  try { await profilePhotos.remove(req.user.id); res.set('Cache-Control', 'no-store').json({ success: true, message: 'Photo de profil supprimée.', avatarUrl: null }); }
  catch (error) { next(error); }
}
