import React from 'react';

export default function LiveFeed({ feed }) {
  return (
    <div className="feed-box">
      <div className="feed-header">
        <h3>Live Activity Feed</h3>
        <span className="badge success">● Kafka Live</span>
      </div>

      <div className="feed-list">
        {feed.length === 0 ? (
          <div className="no-feed">Waiting for activity...</div>
        ) : (
          feed.map((item, idx) => (
            <div key={idx} className="feed-item">
              <p className="feed-msg">{item.message}</p>
              <span className="feed-meta">
                {item.txn}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}