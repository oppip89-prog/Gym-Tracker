package it.omcr.gymtracker;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.WearableListenerService;

/** Receives Wear OS commands even when the phone activity is not visible. */
public class PhoneWearListenerService extends WearableListenerService {
    @Override
    public void onDataChanged(DataEventBuffer events) {
        for (DataEvent event : events) {
            if (event.getType() != DataEvent.TYPE_CHANGED) continue;
            String path = event.getDataItem().getUri().getPath();
            if (path == null || !path.startsWith("/gymtracker/command/")) continue;
            try {
                String payload = DataMapItem.fromDataItem(event.getDataItem()).getDataMap().getString("payload");
                if (payload != null) PhoneWearSync.receiveCommand(this, payload);
            } catch (Exception ignored) { }
        }
    }
}
