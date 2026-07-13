import { useState } from 'react';

// Bundles the field state shared by NewPostSheet and EditPostSheet so both
// can drive the same PostFormFields render logic (FRE-316).
export function usePostFormState(initial = {}) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [startHouse, setStartHouse] = useState(initial.startHouse ?? '');
  const [endHouse, setEndHouse] = useState(initial.endHouse ?? '');
  const [startDate, setStartDate] = useState(initial.startDate ?? '');
  const [endDate, setEndDate] = useState(initial.endDate ?? '');
  const [startTime, setStartTime] = useState(initial.startTime ?? '');
  const [endTime, setEndTime] = useState(initial.endTime ?? '');
  const [link, setLink] = useState(initial.link ?? '');
  const [eventDate, setEventDate] = useState(initial.eventDate ?? '');
  const [eventTime, setEventTime] = useState(initial.eventTime ?? '');
  const [photoKey, setPhotoKey] = useState(initial.photoKey ?? null);
  const [photoPreview, setPhotoPreview] = useState(initial.photoPreview ?? null);
  const [uploading, setUploading] = useState(false);

  return {
    title, setTitle,
    body, setBody,
    startHouse, setStartHouse,
    endHouse, setEndHouse,
    startDate, setStartDate,
    endDate, setEndDate,
    startTime, setStartTime,
    endTime, setEndTime,
    link, setLink,
    eventDate, setEventDate,
    eventTime, setEventTime,
    photoKey, setPhotoKey,
    photoPreview, setPhotoPreview,
    uploading, setUploading,
  };
}
