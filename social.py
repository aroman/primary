import facebook

graph = facebook.GraphAPI("CAAMObALb0uMBAMF4VcR9ZB4ZBYKn8xogZAi36WGYiiJHSKI40Nk8IOgfazrvbtYzwZCt8bBTu6SjPovaoz2pLM3VL4tPNzS3QwAEe4K0pvUeeH0tOGQojeHyAZBxjO4w4WXwUHbOCKjmr2MMrBAoAjX9ZBQilVFYQnNtmlXtabPZAhyKgGHMEtqHHOCpvHrAH3eA1sKb6G6X5E9b18o6fbIdd46RsKfe3UZD", version="1.0")
profile = graph.get_object("me/friends")
friends = graph.get_connections("me", "friends")

print(profile)
print(friends)
