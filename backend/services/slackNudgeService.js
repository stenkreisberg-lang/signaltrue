import SlackNudge from '../models/slackNudge.js';

export async function createSlackNudge(data) {
  return SlackNudge.create(data);
}

export async function getSlackNudges(orgId) {
  return SlackNudge.find({ organizationId: orgId });
}

export async function updateSlackNudge(id, data) {
  return SlackNudge.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteSlackNudge(id) {
  return SlackNudge.findByIdAndDelete(id);
}
