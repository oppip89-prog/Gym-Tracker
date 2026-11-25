package it.omcr.gymtracker.wear;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.WearableListenerService;

public class WatchDataListenerService extends WearableListenerService {
    @Override
    public void onDataChanged(DataEventBuffer events) {
        for (DataEvent event : events) {
            if (event.getType() != DataEvent.TYPE_CHANGED) continue;
            try {
                String path = event.getDataItem().getUri().getPath();
                DataMap map = DataMapItem.fromDataItem(event.getDataItem()).getDataMap();
                if ("/gymtracker/session".equals(path)) {
                    WatchStore.receiveSession(this, map.getString("payload"));
                } else if (path != null && path.startsWith("/gymtracker/ack/")) {
                    WatchStore.receiveAck(this, map.getString("id"),
                            map.getString("status"), map.getString("message"));
                }
            } catch (Exception ignored) { }
        }
    }
}
