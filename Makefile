# The project lives in track_2b/. These targets forward to it.
.PHONY: run build stop test benchmark
run build stop test benchmark:
	$(MAKE) -C track_2b $@
